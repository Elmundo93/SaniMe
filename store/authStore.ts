import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureJSON, setSecureJSON, deleteSecureItem } from '../lib/secureStorage';
import type { Benutzer } from '../types';

const TOKEN_KEY = 'sanime_token';
const BENUTZER_KEY = 'sanime_benutzer';

interface AuthState {
  benutzer: Benutzer | null;
  token: string | null;
  onboardingAbgeschlossen: boolean;
  isLoading: boolean;

  setBenutzer: (benutzer: Benutzer, token: string) => Promise<void>;
  abmelden: () => Promise<void>;
  onboardingAbschliessen: () => Promise<void>;
  laden: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  benutzer: null,
  token: null,
  onboardingAbgeschlossen: false,
  isLoading: true,

  setBenutzer: async (benutzer, token) => {
    try {
      await setSecureJSON(TOKEN_KEY, token);
      await setSecureJSON(BENUTZER_KEY, benutzer);
    } catch (e) {
      if (__DEV__) console.warn('[authStore] Konnte Token/Benutzer nicht sicher speichern', e);
    }
    set({ benutzer, token });
  },

  abmelden: async () => {
    try {
      await deleteSecureItem(TOKEN_KEY);
      await deleteSecureItem(BENUTZER_KEY);
    } catch (e) {
      if (__DEV__) console.warn('[authStore] Konnte Token/Benutzer nicht sicher löschen', e);
    }
    set({ benutzer: null, token: null });
  },

  onboardingAbschliessen: async () => {
    await AsyncStorage.setItem('sanime_onboarding', 'true');
    set({ onboardingAbgeschlossen: true });
  },

  laden: async () => {
    try {
      let [token, benutzer, onboarding] = await Promise.all([
        getSecureJSON<string>(TOKEN_KEY),
        getSecureJSON<Benutzer>(BENUTZER_KEY),
        AsyncStorage.getItem('sanime_onboarding'),
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
        onboardingAbgeschlossen: onboarding === 'true',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
