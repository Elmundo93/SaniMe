import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transition } from '@sanime/domain';
import type { CustomerContact, OcrResult, OnboardingEvent, OnboardingSession, OnboardingStatus, TransitionResult } from '@sanime/domain';
import { useAuthStore } from './authStore';
import * as onboardingApi from '../lib/api/onboarding';
import { trackOnboarding } from '../lib/analytics';
import { getSecureJSON, setSecureJSON, deleteSecureItem } from '../lib/secureStorage';

const SESSION_KEY = 'sanime_onboarding_session';
const SENSITIVE_KEY = 'sanime_onboarding_sensitive';

// OCR-Ergebnis (Diagnose, Versichertennummer, Patientenname) und Kontaktdaten sind
// die einzigen Session-Felder mit echten Gesundheits-/Versicherungsdaten — die landen
// verschlüsselt im SecureStore, statt im Klartext-AsyncStorage wie der Rest der
// (beliebig wachsenden) Maschinen-Session. Fotos bleiben als reine URI-Zeiger im
// AsyncStorage-Teil; sie zeigen auf App-Sandbox-Dateien, nicht auf die Bilddaten selbst.
interface SensitiveSessionData {
  ocrResult: OcrResult | null;
  customerContact: CustomerContact;
}

export interface StatusMeta {
  route: string;
  schritt: number;
}

// Einzige Stelle, an der Machine-Status auf konkrete Routen/Fortschrittsnummern gemappt wird.
export const STATUS_META: Record<OnboardingStatus, StatusMeta> = {
  WILLKOMMEN: { route: '/onboarding', schritt: 1 },
  LEISTUNGSUEBERSICHT: { route: '/onboarding/leistungsuebersicht', schritt: 2 },
  REZEPT_AUFNAHME: { route: '/scan/rezept', schritt: 3 },
  REZEPT_PRUEFUNG: { route: '/scan/review', schritt: 4 },
  KRANKENKASSE_AUFNAHME: { route: '/scan/krankenkasse', schritt: 5 },
  DATENPRUEFUNG: { route: '/scan/datenpruefung', schritt: 6 },
  VERSORGUNGSAUSWAHL: { route: '/scan/versorgungen', schritt: 7 },
  TERMINPLANUNG: { route: '/scan/termin', schritt: 8 },
  ZUSAMMENFASSUNG: { route: '/scan/zusammenfassung', schritt: 9 },
  CHECKOUT: { route: '/scan/checkout', schritt: 10 },
  CHECKOUT_FEHLGESCHLAGEN: { route: '/scan/checkout', schritt: 10 },
  ABGESCHLOSSEN: { route: '/(app)/dashboard', schritt: 11 },
};

interface OnboardingState {
  session: OnboardingSession | null;
  isLoading: boolean;

  starten: () => Promise<OnboardingSession>;
  laden: () => Promise<void>;
  dispatch: (event: OnboardingEvent, code?: string) => Promise<TransitionResult & { devCode?: string }>;
  abschliessen: () => Promise<void>;
}

// A local cache of whatever the backend last confirmed — never the source of
// truth itself. dispatch()/starten() already synced with the real backend
// before calling this; it just makes the session available offline/cold-start.
async function persistSession(session: OnboardingSession) {
  const { ocrResult, customerContact, ...rest } = session;
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(rest));
    await setSecureJSON<SensitiveSessionData>(SENSITIVE_KEY, { ocrResult, customerContact });
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
function emitAnalyticsForTransition(before: OnboardingSession, after: OnboardingSession, event: OnboardingEvent) {
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
      trackOnboarding({ name: 'supply_chosen', produktKategorie: event.produkt.kategorie });
      break;
    case 'TERMIN_AUSGEWAEHLT':
      trackOnboarding({ name: 'appointment_chosen' });
      break;
    case 'AUFTRAG_BESTAETIGT':
      trackOnboarding({ name: 'checkout_started' });
      break;
    case 'ZAHLUNG_ERFOLGREICH': {
      trackOnboarding({ name: 'checkout_completed' });
      const dauerSekunden = Math.round(
        (new Date(after.aktualisiert).getTime() - new Date(after.erstellt).getTime()) / 1000,
      );
      trackOnboarding({ name: 'onboarding_completed', dauerSekunden });
      break;
    }
  }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  session: null,
  isLoading: true,

  starten: async () => {
    const bestehende = get().session;
    if (bestehende && bestehende.status !== 'ABGESCHLOSSEN') {
      return bestehende;
    }
    const { sessionSecret } = await onboardingApi.create();
    await useAuthStore.getState().setToken(sessionSecret);
    const session = await onboardingApi.getCurrent();
    await persistSession(session);
    set({ session });
    return session;
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
      const rest = JSON.parse(json) as Omit<OnboardingSession, 'ocrResult' | 'customerContact'>;
      const sensitive = await getSecureJSON<SensitiveSessionData>(SENSITIVE_KEY);
      set({
        session: {
          ...rest,
          ocrResult: sensitive?.ocrResult ?? null,
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
      let fresh: OnboardingSession;
      let devCode: string | undefined;
      if (event.type === 'ZAHLUNG_ERFOLGREICH') {
        // Completion is its own endpoint, excluded from the PATCH schema by
        // design — the server builds the real Supply/Order here, not the client.
        await onboardingApi.complete(session.id);
        fresh = await onboardingApi.getCurrent();
      } else {
        const result = await onboardingApi.patch(session.id, event, code);
        fresh = result.session;
        devCode = result.devCode;
      }
      await persistSession(fresh);
      set({ session: fresh });
      emitAnalyticsForTransition(session, fresh, event);
      return { ok: true, session: fresh, devCode };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Netzwerkfehler' };
    }
  },

  abschliessen: async () => {
    const session = get().session;
    if (!session) return;

    if (!useAuthStore.getState().benutzer) {
      // Darf nie fehlschlagen, solange die Guard-Kette (Datenprüfung, useOnboardingGuard
      // requireOcrResult auf checkout.tsx) hält — schlägt trotzdem hart fehl statt
      // onboardingAbschliessen() zu erreichen, denn genau diese Kombination
      // (onboardingAbgeschlossen=true, benutzer=null) schickt jeden künftigen App-Start
      // ohne Ausweg auf den Re-Login-Screen.
      if (!session.ocrResult || !session.customerContact.telefon) {
        throw new Error('abschliessen(): OCR-Ergebnis oder Telefonnummer fehlt, kann keinen Benutzer anlegen');
      }
      // benutzer is display-only (never used by any ownership check — those
      // key off the bearer secret), so this stays a client-side derivation
      // rather than a new backend endpoint. token is the real sessionSecret
      // this session already authenticates with, not a fabricated one.
      await useAuthStore.getState().setBenutzer(
        {
          id: session.versorgungId ?? `benutzer-${session.id}`,
          vorname: session.ocrResult.patient.name.split(' ')[0] ?? '',
          nachname: session.ocrResult.patient.name.split(' ').slice(1).join(' '),
          email: session.customerContact.email ?? undefined,
          telefon: session.customerContact.telefon,
          krankenkasse: session.ocrResult.krankenkasse.name,
          versichertenNr: session.ocrResult.krankenkasse.versichertenNr,
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
      if (!bestehender.krankenkasse && session.ocrResult?.krankenkasse.name) {
        patch.krankenkasse = session.ocrResult.krankenkasse.name;
      }
      if (!bestehender.versichertenNr && session.ocrResult?.krankenkasse.versichertenNr) {
        patch.versichertenNr = session.ocrResult.krankenkasse.versichertenNr;
      }
      if (Object.keys(patch).length > 0) {
        await useAuthStore.getState().aktualisiereBenutzer(patch);
      }
    }
    await useAuthStore.getState().onboardingAbschliessen();

    await AsyncStorage.removeItem(SESSION_KEY);
    await deleteSecureItem(SENSITIVE_KEY);
    set({ session: null });
  },
}));
