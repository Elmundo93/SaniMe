import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Benutzer } from '../types';

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
    await AsyncStorage.setItem('sanime_token', token);
    await AsyncStorage.setItem('sanime_benutzer', JSON.stringify(benutzer));
    set({ benutzer, token });
  },

  abmelden: async () => {
    await AsyncStorage.multiRemove(['sanime_token', 'sanime_benutzer']);
    set({ benutzer: null, token: null });
  },

  onboardingAbschliessen: async () => {
    await AsyncStorage.setItem('sanime_onboarding', 'true');
    set({ onboardingAbgeschlossen: true });
  },

  laden: async () => {
    try {
      const [token, benutzerJson, onboarding] = await AsyncStorage.multiGet([
        'sanime_token',
        'sanime_benutzer',
        'sanime_onboarding',
      ]);
      set({
        token: token[1],
        benutzer: benutzerJson[1] ? JSON.parse(benutzerJson[1]) : null,
        onboardingAbgeschlossen: onboarding[1] === 'true',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
