import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomerContact, OcrResult, OnboardingSession, OnboardingStatus } from '../types';
import { erstelleLeereSession, transition } from './onboardingMachine';
import type { OnboardingEvent, TransitionResult } from './onboardingMachine';
import { useAuthStore } from './authStore';
import { useVersorgungStore, baueVersorgungAusSession } from './versorgungStore';
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
  dispatch: (event: OnboardingEvent) => Promise<TransitionResult>;
  abschliessen: () => Promise<void>;
}

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
  // In Produktion: zusätzlich Backend-Sync-Aufruf hier
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
    const neu = erstelleLeereSession(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await persistSession(neu);
    set({ session: neu });
    return neu;
  },

  laden: async () => {
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

  dispatch: async (event) => {
    const session = get().session;
    if (!session) {
      return { ok: false, reason: 'Keine aktive OnboardingSession' };
    }
    const result = transition(session, event);
    if (result.ok) {
      await persistSession(result.session);
      set({ session: result.session });
      emitAnalyticsForTransition(session, result.session, event);
    }
    return result;
  },

  abschliessen: async () => {
    const session = get().session;
    if (!session) return;

    const versorgungId = session.versorgungId ?? `v-${Date.now()}`;
    const versorgung = baueVersorgungAusSession(session, versorgungId);
    useVersorgungStore.getState().versorgungHinzufügen(versorgung);

    if (!useAuthStore.getState().benutzer) {
      // Darf nie fehlschlagen, solange die Guard-Kette (Datenprüfung, useOnboardingGuard
      // requireOcrResult auf checkout.tsx) hält — schlägt trotzdem hart fehl statt
      // onboardingAbschliessen() zu erreichen, denn genau diese Kombination
      // (onboardingAbgeschlossen=true, benutzer=null) schickt jeden künftigen App-Start
      // ohne Ausweg auf den Re-Login-Screen.
      if (!session.ocrResult || !session.customerContact.telefon) {
        throw new Error('abschliessen(): OCR-Ergebnis oder Telefonnummer fehlt, kann keinen Benutzer anlegen');
      }
      await useAuthStore.getState().setBenutzer(
        {
          id: `benutzer-${versorgungId}`,
          vorname: session.ocrResult.patient.name.split(' ')[0] ?? '',
          nachname: session.ocrResult.patient.name.split(' ').slice(1).join(' '),
          email: session.customerContact.email ?? undefined,
          telefon: session.customerContact.telefon,
          krankenkasse: session.ocrResult.krankenkasse.name,
          versichertenNr: session.ocrResult.krankenkasse.versichertenNr,
        },
        `token-${versorgungId}`,
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
