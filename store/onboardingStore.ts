import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingSession, OnboardingStatus } from '../types';
import { erstelleLeereSession, transition } from './onboardingMachine';
import type { OnboardingEvent, TransitionResult } from './onboardingMachine';
import { useAuthStore } from './authStore';
import { useVersorgungStore, baueVersorgungAusSession } from './versorgungStore';
import { trackOnboarding } from '../lib/analytics';

const SESSION_KEY = 'sanime_onboarding_session';

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
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
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
      set({ session: json ? (JSON.parse(json) as OnboardingSession) : null, isLoading: false });
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

    if (!useAuthStore.getState().benutzer && session.ocrResult && session.customerContact.telefon) {
      await useAuthStore.getState().setBenutzer(
        {
          id: `benutzer-${versorgungId}`,
          vorname: session.ocrResult.patient.name.split(' ')[0] ?? '',
          nachname: session.ocrResult.patient.name.split(' ').slice(1).join(' ') || session.ocrResult.patient.name,
          email: session.customerContact.email ?? undefined,
          telefon: session.customerContact.telefon,
          krankenkasse: session.ocrResult.krankenkasse.name,
          versichertenNr: session.ocrResult.krankenkasse.versichertenNr,
        },
        `token-${versorgungId}`,
      );
    }
    await useAuthStore.getState().onboardingAbschliessen();

    await AsyncStorage.removeItem(SESSION_KEY);
    set({ session: null });
  },
}));
