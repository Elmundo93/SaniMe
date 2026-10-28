import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AGB_VERSION, DATENSCHUTZ_VERSION, consentErteilt, transition } from '@sanime/domain';
import type {
  ClientOnboardingEvent,
  CustomerContact,
  OcrKrankenkasse,
  OcrResult,
  OnboardingSession,
  OnboardingStatus,
  TransitionResult,
  WarenkorbPosition,
} from '@sanime/domain';
import { useAuthStore } from './authStore';
import { useWarenkorbStore } from './warenkorbStore';
import { useVersorgungStore } from './versorgungStore';
import * as onboardingApi from '../lib/api/onboarding';
import { trackOnboarding } from '../lib/analytics';
import { getSecureJSON, setSecureJSON, deleteSecureItem } from '../lib/secureStorage';
import { ApiError } from '../lib/api/client';
import { ladeEinwilligungsToken, speichereEinwilligungsToken, vergesseEinwilligungsToken } from '../lib/einwilligung';

const SESSION_KEY = 'sanime_onboarding_session';
const SENSITIVE_KEY = 'sanime_onboarding_sensitive';

// OCR-Ergebnis, Krankenkasse, Warenkorb-Positionen (Rezepte; schon die Produktliste
// ist ein Gesundheitsdatum) und Kontaktdaten sind die Session-Felder mit echten
// Gesundheits-/Versicherungsdaten — die landen
// verschlüsselt im SecureStore, statt im Klartext-AsyncStorage wie der Rest der
// (beliebig wachsenden) Maschinen-Session. Fotos bleiben als reine URI-Zeiger im
// AsyncStorage-Teil; sie zeigen auf App-Sandbox-Dateien, nicht auf die Bilddaten selbst.
interface SensitiveSessionData {
  ocrResult: OcrResult | null;
  krankenkasse: OcrKrankenkasse | null;
  positionen: WarenkorbPosition[];
  customerContact: CustomerContact;
}

export interface StatusMeta {
  route: string;
}

// Einzige Stelle, an der Machine-Status auf konkrete Routen gemappt wird.
export const STATUS_META: Record<OnboardingStatus, StatusMeta> = {
  WILLKOMMEN: { route: '/onboarding' },
  LEISTUNGSUEBERSICHT: { route: '/onboarding/leistungsuebersicht' },
  REZEPT_AUFNAHME: { route: '/scan/rezept' },
  REZEPT_PRUEFUNG: { route: '/scan/review' },
  KRANKENKASSE_AUFNAHME: { route: '/scan/krankenkasse' },
  DATENPRUEFUNG: { route: '/scan/datenpruefung' },
  VERSORGUNGSAUSWAHL: { route: '/scan/versorgungen' },
  TERMINPLANUNG: { route: '/scan/termin' },
  CHECKOUT: { route: '/scan/checkout' },
  CHECKOUT_FEHLGESCHLAGEN: { route: '/scan/checkout' },
  ABGESCHLOSSEN: { route: '/dashboard' },
};

// Der Rezept-Scan ist entweder der Weg in die Bestellung (Rezept zuerst: bis zur
// Versorgungsauswahl, dann die Kasse) oder eine Speiche des Checkouts für eine
// Position (endet mit der Datenprüfung wieder an der Kasse). Die Krankenkassen-
// karte zählt immer mit, auch wenn sie beim zweiten Rezept übersprungen wird.
const REZEPT_SCAN: OnboardingStatus[] = ['REZEPT_AUFNAHME', 'REZEPT_PRUEFUNG', 'KRANKENKASSE_AUFNAHME', 'DATENPRUEFUNG'];

/** Fortschritt im Rezept-Scan — null für Screens ohne Schrittzähler (Kasse, Termin). */
export function schrittInfo(session: OnboardingSession): { aktuell: number; gesamt: number } | null {
  const reihenfolge = session.aktivePositionId
    ? REZEPT_SCAN
    : [...REZEPT_SCAN, 'VERSORGUNGSAUSWAHL' as const, 'CHECKOUT' as const];
  const index = reihenfolge.indexOf(session.status);
  if (index === -1 || session.status === 'CHECKOUT') return null;
  return { aktuell: index + 1, gesamt: reihenfolge.length };
}

/** Status, in denen gerade eine Speiche bzw. der Rezept-Scan läuft — dort setzt
 * ein Einstieg die Sitzung fort, statt ein neues Event zu schicken. */
export function istLaufenderSchritt(status: OnboardingStatus): boolean {
  return [...REZEPT_SCAN, 'VERSORGUNGSAUSWAHL', 'TERMINPLANUNG'].includes(status);
}

interface OnboardingState {
  session: OnboardingSession | null;
  isLoading: boolean;
  // Client-only, nie an AsyncStorage/Backend gereicht: ein Warenkorb-„Zur Kasse“,
  // das getroffen wurde, bevor AGB/Datenschutz für die aktuelle Session erteilt
  // sind. leistungsuebersicht.tsx dispatcht dieses Event anstelle von WEITER,
  // sobald beide Einwilligungen vorliegen — siehe prozessStarten().
  pendingEinstiegEvent: ClientOnboardingEvent | null;

  starten: () => Promise<OnboardingSession>;
  /** Einziger Einstieg in einen Prozess (Rezept scannen, Zur Kasse): startet
   * bzw. holt die Session, übernimmt eine dauerhafte Einwilligung und liefert die
   * Route, auf die der Screen navigieren soll — oder einen Fehlergrund. */
  prozessStarten: (einstieg: ClientOnboardingEvent | 'REZEPT') => Promise<{ ok: true; route: string } | { ok: false; reason: string }>;
  laden: () => Promise<void>;
  dispatch: (event: ClientOnboardingEvent, code?: string) => Promise<TransitionResult & { devCode?: string }>;
  setPendingEinstiegEvent: (event: ClientOnboardingEvent | null) => void;
  einreichen: () => Promise<TransitionResult>;
  abschliessen: () => Promise<void>;
}

// A local cache of whatever the backend last confirmed — never the source of
// truth itself. dispatch()/starten() already synced with the real backend
// before calling this; it just makes the session available offline/cold-start.
async function persistSession(session: OnboardingSession) {
  const { ocrResult, krankenkasse, positionen, customerContact, ...rest } = session;
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(rest));
    await setSecureJSON<SensitiveSessionData>(SENSITIVE_KEY, { ocrResult, krankenkasse, positionen, customerContact });
  } catch (e) {
    // Best effort: dispatch() hat die Transition bereits im Zustand-Store übernommen;
    // ein Storage-Fehler (Disk voll, Keystore-Fehler) soll den Nutzerfluss nicht mit
    // einer unbehandelten Promise-Rejection blockieren, nur beim nächsten laden()
    // hinter dem in-memory-Stand zurückbleiben.
    if (__DEV__) console.warn('[onboardingStore] persistSession fehlgeschlagen', e);
  }
}

// Zentrale Instrumentierung: genau ein Analytics-Event pro echtem Übergang, ausgelöst
// vom dispatch() selbst statt von einzelnen Screens — verhindert Doppel-Feuern bei
// Remounts/Guard-Redirects und hält die "keine Gesundheitsdaten"-Prüffläche an einer Stelle.
function emitAnalyticsForTransition(before: OnboardingSession, after: OnboardingSession, event: ClientOnboardingEvent) {
  if (before.status !== after.status) {
    trackOnboarding({ name: 'screen_opened', status: after.status });
  }
  switch (event.type) {
    case 'REZEPT_OCR_ABGESCHLOSSEN':
      trackOnboarding({ name: 'ocr_success', feld: 'rezept' });
      break;
    case 'KRANKENKASSE_OCR_ABGESCHLOSSEN':
      trackOnboarding({ name: 'ocr_success', feld: 'krankenkasse' });
      break;
    case 'FELD_KORRIGIERT':
      trackOnboarding({ name: 'ocr_corrected' });
      break;
    case 'SUPPLY_AUSGEWAEHLT':
      trackOnboarding({ name: 'supply_chosen' });
      break;
    case 'TERMIN_AUSGEWAEHLT':
      trackOnboarding({ name: 'appointment_chosen' });
      break;
    case 'WARENKORB_UEBERNOMMEN':
      // Nur beim Betreten der Kasse, nicht bei jedem Abgleich — und nie mit
      // Produkten oder ihrer Anzahl (Gesundheitsdaten).
      if (before.status !== 'CHECKOUT') trackOnboarding({ name: 'checkout_started' });
      break;
  }
}

// Der Abschluss läuft nie über dispatch() (die beiden Abschluss-Events sind
// reine Server-Events) — deshalb feuern die Abschluss-Events hier, aus
// abschliessen(), das nach beiden Abschlusswegen (einreichen() bzw. dem
// Stripe-Webhook) genau einmal aufgerufen wird.
function emitAnalyticsForAbschluss(session: OnboardingSession) {
  trackOnboarding({ name: 'checkout_completed' });
  const dauerSekunden = Math.round((Date.now() - new Date(session.erstellt).getTime()) / 1000);
  trackOnboarding({ name: 'onboarding_completed', dauerSekunden });
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  session: null,
  isLoading: true,
  pendingEinstiegEvent: null,

  setPendingEinstiegEvent: (event) => set({ pendingEinstiegEvent: event }),

  starten: async () => {
    const bestehende = get().session;
    if (bestehende && bestehende.status !== 'ABGESCHLOSSEN') {
      return bestehende;
    }
    const { sessionSecret } = await onboardingApi.create();
    await useAuthStore.getState().setToken(sessionSecret);
    let session = await onboardingApi.getCurrent();

    // Dauerhafte Einwilligung (Katalogplan §2.3): liegt ein Token einer früheren
    // Zustimmung vor, übernimmt der Server sie — sofern die Rechtstexte gleich
    // geblieben sind und nichts widerrufen wurde. Dann entfallen Willkommen und
    // Leistungsübersicht. Lehnt der Server ab (400: widerrufen, veraltet,
    // unbekannt), ist der Token wertlos und wird verworfen; bei einem
    // Netzwerkfehler bleibt er für den nächsten Versuch erhalten.
    const token = await ladeEinwilligungsToken();
    if (token) {
      try {
        const res = await onboardingApi.patch(session.id, {
          type: 'EINWILLIGUNG_UEBERNOMMEN',
          einwilligungsToken: token,
          agbVersion: AGB_VERSION,
          datenschutzVersion: DATENSCHUTZ_VERSION,
        });
        session = res.session;
      } catch (e) {
        if (e instanceof ApiError && e.status === 400) await vergesseEinwilligungsToken();
      }
    }

    await persistSession(session);
    set({ session });
    return session;
  },

  prozessStarten: async (einstieg) => {
    let session: OnboardingSession;
    try {
      session = await get().starten();
    } catch {
      return { ok: false, reason: 'Netzwerkfehler' };
    }
    const event: ClientOnboardingEvent = einstieg === 'REZEPT' ? { type: 'WEITER' } : einstieg;

    // Einwilligung liegt vor (übernommen oder in dieser Session erteilt) —
    // direkt in den Prozess.
    if (session.status === 'LEISTUNGSUEBERSICHT' && consentErteilt(session)) {
      const result = await get().dispatch(event);
      return result.ok ? { ok: true, route: STATUS_META[result.session.status].route } : { ok: false, reason: result.reason };
    }
    // Noch keine Einwilligung: Auswahl merken, Willkommen/Leistungsübersicht
    // holen sie ein und dispatchen das gemerkte Event danach.
    if (session.status === 'WILLKOMMEN' || session.status === 'LEISTUNGSUEBERSICHT') {
      get().setPendingEinstiegEvent(einstieg === 'REZEPT' ? null : event);
      return { ok: true, route: STATUS_META[session.status].route };
    }
    // Ein laufender Scan/Termin wird fortgesetzt, nicht überfahren.
    if (istLaufenderSchritt(session.status)) return { ok: true, route: STATUS_META[session.status].route };
    // An der Kasse: „Rezept scannen“ wird zu einem weiteren Rezept dieser
    // Bestellung, ein Warenkorb gleicht die Positionen ab.
    const kassenEvent: ClientOnboardingEvent = einstieg === 'REZEPT' ? { type: 'REZEPT_HINZUFUEGEN' } : einstieg;
    const result = await get().dispatch(kassenEvent);
    return result.ok ? { ok: true, route: STATUS_META[result.session.status].route } : { ok: false, reason: result.reason };
  },

  laden: async () => {
    const token = useAuthStore.getState().token;
    if (token) {
      try {
        const session = await onboardingApi.getCurrent();
        await persistSession(session);
        set({ session, isLoading: false });
        return;
      } catch {
        // Offline or the stored secret no longer resolves — fall back to the
        // local cache below rather than blocking app start entirely.
      }
    }
    try {
      const json = await AsyncStorage.getItem(SESSION_KEY);
      if (!json) {
        set({ session: null, isLoading: false });
        return;
      }
      const rest = JSON.parse(json) as Omit<OnboardingSession, keyof SensitiveSessionData>;
      const sensitive = await getSecureJSON<SensitiveSessionData>(SENSITIVE_KEY);
      set({
        session: {
          ...rest,
          ocrResult: sensitive?.ocrResult ?? null,
          krankenkasse: sensitive?.krankenkasse ?? null,
          positionen: sensitive?.positionen ?? [],
          customerContact: sensitive?.customerContact ?? { email: null, telefon: null, telefonVerifiziert: false },
        },
        isLoading: false,
      });
    } catch {
      set({ session: null, isLoading: false });
    }
  },

  // Request-then-apply, never optimistic-then-reconcile: the local
  // transition() call below is only a fast-fail legality pre-check (the FSM
  // is shared with the backend, so a client-illegal transition is
  // guaranteed server-illegal too) — its result is never written to the
  // store. The server response is the only thing that ever becomes the new
  // session, since it injects fields the client can't compute itself
  // (server-recomputed produkte, devCode, consent ipAdresse, ...).
  dispatch: async (event, code) => {
    const session = get().session;
    if (!session) {
      return { ok: false, reason: 'Keine aktive OnboardingSession' };
    }
    const localCheck = transition(session, event);
    if (!localCheck.ok) return localCheck;

    try {
      const { session: fresh, devCode, einwilligungsToken } = await onboardingApi.patch(session.id, event, code);
      // Erste vollständige Zustimmung → Token für die Übernahme in künftige Sessions.
      if (einwilligungsToken) await speichereEinwilligungsToken(einwilligungsToken);
      await persistSession(fresh);
      set({ session: fresh });
      emitAnalyticsForTransition(session, fresh, event);
      return { ok: true, session: fresh, devCode };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Netzwerkfehler' };
    }
  },

  // Reicht eine Bestellung ohne Checkout-Zahlung ein (nur Kassenartikel bzw.
  // kostenlose Selbstzahler-Artikel).
  // Eigener Endpoint statt PATCH: erst der Server legt die echte
  // Versorgung/Bestellung an. Ein zahlungspflichtiger Selbstzahler-Kauf wird
  // hier lokal wie serverseitig vom FSM-Guard abgelehnt — den schließt nur der
  // Stripe-Webhook ab (siehe checkout.tsx's wartenAufAbschluss).
  einreichen: async () => {
    const session = get().session;
    if (!session) {
      return { ok: false, reason: 'Keine aktive OnboardingSession' };
    }
    const localCheck = transition(session, { type: 'AUFTRAG_EINGEREICHT' });
    if (!localCheck.ok) return localCheck;

    try {
      await onboardingApi.complete(session.id);
      const fresh = await onboardingApi.getCurrent();
      await persistSession(fresh);
      set({ session: fresh });
      return { ok: true, session: fresh };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Netzwerkfehler' };
    }
  },

  abschliessen: async () => {
    const session = get().session;
    if (!session) return;
    emitAnalyticsForAbschluss(session);
    // Lieferadresse vom Rezept (Personalienfeld) — der Server hat sie beim
    // Abschluss schon als Kundenadresse an den Auftrag gehängt.
    const rezeptAdresse = session.positionen.find((p) => p.rezept?.patient.adresse)?.rezept?.patient.adresse ?? null;

    // Bestellt jemand mit einer anderen Versichertennummer als der lokal
    // gespeicherten (z.B. für ein Familienmitglied), gilt ab jetzt die Person
    // vom Rezept — so zeigt die App, für wen die neuen Versorgungen sind.
    // Gleiche oder fehlende Nummer: nur Lücken füllen (Profilkorrekturen bleiben).
    const bisher = useAuthStore.getState().benutzer;
    const neueNr = normNr(session.krankenkasse?.versichertenNr);
    const anderePerson = !!bisher && !!neueNr && !!normNr(bisher.versichertenNr) && normNr(bisher.versichertenNr) !== neueNr;

    if (!bisher || anderePerson) {
      // Darf nie fehlschlagen, solange der Checkout eine bestätigte Telefonnummer
      // verlangt — schlägt trotzdem hart fehl statt
      // onboardingAbschliessen() zu erreichen, denn genau diese Kombination
      // (onboardingAbgeschlossen=true, benutzer=null) schickt jeden künftigen App-Start
      // ohne Ausweg auf den Re-Login-Screen.
      // Eine reine Selbstzahler-Bestellung hat nie ein Rezept — vorname/
      // nachname/krankenkasse bleiben dann leer statt hart zu crashen; nur die
      // Telefonnummer ist immer Pflicht (der Checkout verlangt sie).
      // Wer schon bekannt war, hat die Telefonbestätigung übersprungen — dann
      // bleibt die Nummer des Geräts.
      const telefon = session.customerContact.telefon || bisher?.telefon || '';
      if (!telefon) {
        throw new Error('abschliessen(): Telefonnummer fehlt, kann keinen Benutzer anlegen');
      }
      const rezept = session.positionen.find((p) => p.rezept)?.rezept ?? null;
      const vollerName = rezept?.patient.name ?? '';
      // benutzer is display-only (never used by any ownership check — those
      // key off the bearer secret), so this stays a client-side derivation
      // rather than a new backend endpoint. token is the real sessionSecret
      // this session already authenticates with, not a fabricated one.
      await useAuthStore.getState().setBenutzer(
        {
          id: session.versorgungId ?? `benutzer-${session.id}`,
          // Wie das Backend beim Anlegen des Kunden: der letzte Teil ist der Nachname.
          vorname: vollerName.split(' ').slice(0, -1).join(' '),
          nachname: vollerName.split(' ').slice(-1).join(''),
          email: session.customerContact.email ?? undefined,
          telefon,
          krankenkasse: session.krankenkasse?.name ?? '',
          versichertenNr: session.krankenkasse?.versichertenNr ?? '',
          lieferadresse: rezeptAdresse ?? undefined,
        },
        useAuthStore.getState().token!,
      );
    } else {
      // Bestandskunde: nur Lücken aus der aktuellen Session auffüllen, nie bereits
      // vorhandene (ggf. vom Nutzer im Profil korrigierte) Werte überschreiben.
      const bestehender = useAuthStore.getState().benutzer!;
      const patch: Partial<typeof bestehender> = {};
      if (!bestehender.email && session.customerContact.email) {
        patch.email = session.customerContact.email;
      }
      if (!bestehender.krankenkasse && session.krankenkasse?.name) {
        patch.krankenkasse = session.krankenkasse.name;
      }
      if (!bestehender.versichertenNr && session.krankenkasse?.versichertenNr) {
        patch.versichertenNr = session.krankenkasse.versichertenNr;
      }
      if (!bestehender.lieferadresse?.strasse && rezeptAdresse) {
        patch.lieferadresse = rezeptAdresse;
      }
      if (Object.keys(patch).length > 0) {
        await useAuthStore.getState().aktualisiereBenutzer(patch);
      }
    }
    await useAuthStore.getState().onboardingAbschliessen();

    // Bestellt ist bestellt: der lokale Warenkorb war genau diese Bestellung.
    await useWarenkorbStore.getState().leeren();
    await AsyncStorage.removeItem(SESSION_KEY);
    await deleteSecureItem(SENSITIVE_KEY);
    set({ session: null });
    // Die neue Versorgung sofort zeigen — die Start-Tabs laden sonst nur neu,
    // wenn sich der benutzer ändert (bei Bestandskunden nicht der Fall).
    useVersorgungStore.getState().laden().catch(() => {});
  },
}));

function normNr(nummer: string | undefined): string {
  return (nummer ?? '').trim().toUpperCase();
}
