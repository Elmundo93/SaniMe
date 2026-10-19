import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureJSON, setSecureJSON, deleteSecureItem } from '../lib/secureStorage';
import type { Benutzer, ProfilDaten } from '../types';

const TOKEN_KEY = 'sanime_token';
const BENUTZER_KEY = 'sanime_benutzer';
const VORAB_PROFIL_KEY = 'sanime_profil_vorab';

interface AuthState {
  benutzer: Benutzer | null;
  /** Vom Gast eingetragene Profildaten, solange noch kein `benutzer` existiert. */
  vorabProfil: ProfilDaten | null;
  token: string | null;
  onboardingAbgeschlossen: boolean;
  isLoading: boolean;

  setBenutzer: (benutzer: Benutzer, token: string) => Promise<void>;
  setToken: (token: string | null) => Promise<void>;
  aktualisiereBenutzer: (patch: Partial<Benutzer>) => Promise<void>;
  /** „Mein Profil“: schreibt in `benutzer`, für Gäste ins Vorab-Profil. */
  aktualisiereProfil: (patch: ProfilDaten) => Promise<void>;
  abmelden: () => Promise<void>;
  onboardingAbschliessen: () => Promise<void>;
  laden: () => Promise<void>;
}

function mitVorabProfil(benutzer: Benutzer, vorab: ProfilDaten | null): Benutzer {
  if (!vorab) return benutzer;
  const leer = (w: string | undefined) => !w || w.trim() === '';
  const adresse = benutzer.lieferadresse;
  return {
    ...benutzer,
    vorname: leer(benutzer.vorname) ? vorab.vorname ?? '' : benutzer.vorname,
    nachname: leer(benutzer.nachname) ? vorab.nachname ?? '' : benutzer.nachname,
    telefon: leer(benutzer.telefon) ? vorab.telefon ?? '' : benutzer.telefon,
    email: leer(benutzer.email) ? vorab.email : benutzer.email,
    krankenkasse: leer(benutzer.krankenkasse) ? vorab.krankenkasse : benutzer.krankenkasse,
    versichertenNr: leer(benutzer.versichertenNr) ? vorab.versichertenNr : benutzer.versichertenNr,
    lieferadresse: adresse && !leer(adresse.strasse) ? adresse : vorab.lieferadresse ?? adresse,
  };
}

/** Das Profil, das „Mein Profil“ und die Vollständigkeits-Aufgabe zeigen: der erkannte
 * Kunde, sonst die vorab eingetragenen Daten des Gasts. */
export const selectProfil = (s: Pick<AuthState, 'benutzer' | 'vorabProfil'>): ProfilDaten | null =>
  s.benutzer ?? s.vorabProfil;

export const useAuthStore = create<AuthState>((set, get) => ({
  benutzer: null,
  vorabProfil: null,
  token: null,
  onboardingAbgeschlossen: false,
  isLoading: true,

  setBenutzer: async (neu, token) => {
    // Vorab eingetragene Daten füllen nur Lücken — was Rezept, Karte oder
    // Kundenstamm liefern, gilt als offiziell und wird nicht überschrieben.
    const benutzer = mitVorabProfil(neu, get().vorabProfil);
    try {
      await deleteSecureItem(VORAB_PROFIL_KEY);
      await setSecureJSON(TOKEN_KEY, token);
      await setSecureJSON(BENUTZER_KEY, benutzer);
    } catch (e) {
      if (__DEV__) console.warn('[authStore] Konnte Token/Benutzer nicht sicher speichern', e);
    }
    set({ benutzer, token, vorabProfil: null });
  },

  // Sets the bearer token alone, before a benutzer is known — the state
  // right after onboardingStore.starten() creates a real session but hasn't
  // identified a customer yet. `token` is the current onboarding session's
  // real sessionSecret, not a fabricated login credential.
  setToken: async (token) => {
    try {
      if (token) await setSecureJSON(TOKEN_KEY, token);
      else await deleteSecureItem(TOKEN_KEY);
    } catch (e) {
      if (__DEV__) console.warn('[authStore] Konnte Token nicht sicher speichern', e);
    }
    set({ token });
  },

  aktualisiereBenutzer: async (patch) => {
    const aktuell = get().benutzer;
    if (!aktuell) return;
    const merged = { ...aktuell, ...patch };
    try {
      await setSecureJSON(BENUTZER_KEY, merged);
    } catch (e) {
      if (__DEV__) console.warn('[authStore] Konnte Benutzer nicht sicher speichern', e);
    }
    set({ benutzer: merged });
  },

  aktualisiereProfil: async (patch) => {
    if (get().benutzer) {
      await get().aktualisiereBenutzer(patch);
      return;
    }
    const merged = { ...get().vorabProfil, ...patch };
    try {
      await setSecureJSON(VORAB_PROFIL_KEY, merged);
    } catch (e) {
      if (__DEV__) console.warn('[authStore] Konnte Profil nicht sicher speichern', e);
    }
    set({ vorabProfil: merged });
  },

  abmelden: async () => {
    try {
      await deleteSecureItem(TOKEN_KEY);
      await deleteSecureItem(BENUTZER_KEY);
      await deleteSecureItem(VORAB_PROFIL_KEY);
    } catch (e) {
      if (__DEV__) console.warn('[authStore] Konnte Token/Benutzer nicht sicher löschen', e);
    }
    set({ benutzer: null, token: null, vorabProfil: null });
  },

  onboardingAbschliessen: async () => {
    await AsyncStorage.setItem('sanime_onboarding', 'true');
    set({ onboardingAbgeschlossen: true });
  },

  laden: async () => {
    try {
      let [token, benutzer, onboarding, vorabProfil] = await Promise.all([
        getSecureJSON<string>(TOKEN_KEY),
        getSecureJSON<Benutzer>(BENUTZER_KEY),
        AsyncStorage.getItem('sanime_onboarding'),
        getSecureJSON<ProfilDaten>(VORAB_PROFIL_KEY),
      ]);

      // Migration: vor der Umstellung auf SecureStore lagen Token/Benutzer in
      // AsyncStorage unter denselben Keys. Ohne diesen Fallback verliert jede
      // bestehende Session ihren Benutzer (onboardingAbgeschlossen bleibt true,
      // benutzer wird null) und landet fälschlich auf dem Re-Login-Screen.
      if (token === null && benutzer === null) {
        const [legacyToken, legacyBenutzerJson] = await AsyncStorage.multiGet([
          'sanime_token',
          'sanime_benutzer',
        ]);
        if (legacyToken[1] && legacyBenutzerJson[1]) {
          token = legacyToken[1];
          benutzer = JSON.parse(legacyBenutzerJson[1]) as Benutzer;
          try {
            await setSecureJSON(TOKEN_KEY, token);
            await setSecureJSON(BENUTZER_KEY, benutzer);
            await AsyncStorage.multiRemove(['sanime_token', 'sanime_benutzer']);
          } catch (e) {
            if (__DEV__) console.warn('[authStore] Migration zu SecureStore fehlgeschlagen', e);
          }
        }
      }

      set({
        token,
        benutzer,
        vorabProfil: benutzer ? null : vorabProfil,
        onboardingAbgeschlossen: onboarding === 'true',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
