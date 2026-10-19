import { create } from 'zustand';
import { WARENKORB_MAX, type WarenkorbArtikel } from '@sanime/domain';
import { getSecureJSON, setSecureJSON } from '../lib/secureStorage';

const KEY = 'sanime_warenkorb';

// Der Warenkorb vor „Zur Kasse“: nur Produkt-IDs (+ optionaler Krankheitsbild-
// Kontext), nur auf diesem Gerät, verschlüsselt im SecureStore — wie die
// Merkliste ist ein Warenkorb voller Hilfsmittel faktisch ein Gesundheitsdatum.
// Stöbern und Sammeln starten keine Sitzung; erst „Zur Kasse“ übergibt ihn per
// WARENKORB_UEBERNOMMEN an den Server, der die Produkte selbst aus dem Katalog
// holt. Keine Analytics.
interface WarenkorbState {
  artikel: WarenkorbArtikel[];
  geladen: boolean;
  laden: () => Promise<void>;
  /** false, wenn der Warenkorb voll ist. */
  hinzufuegen: (artikel: WarenkorbArtikel) => Promise<boolean>;
  entfernen: (produktId: string) => Promise<void>;
  /** Übernimmt den Stand des Servers (z. B. ein Rezept-zuerst gewähltes Produkt). */
  ersetzen: (artikel: WarenkorbArtikel[]) => Promise<void>;
  leeren: () => Promise<void>;
}

async function speichern(artikel: WarenkorbArtikel[]) {
  try {
    await setSecureJSON(KEY, artikel);
  } catch (e) {
    if (__DEV__) console.warn('[warenkorb] Speichern fehlgeschlagen', e);
  }
}

export const useWarenkorbStore = create<WarenkorbState>((set, get) => ({
  artikel: [],
  geladen: false,

  laden: async () => {
    if (get().geladen) return;
    try {
      set({ artikel: (await getSecureJSON<WarenkorbArtikel[]>(KEY)) ?? [], geladen: true });
    } catch {
      set({ artikel: [], geladen: true });
    }
  },

  hinzufuegen: async (neu) => {
    await get().laden();
    const aktuell = get().artikel;
    if (aktuell.some((a) => a.produktId === neu.produktId)) return true;
    if (aktuell.length >= WARENKORB_MAX) return false;
    const artikel = [...aktuell, neu];
    set({ artikel });
    await speichern(artikel);
    return true;
  },

  entfernen: async (produktId) => {
    const artikel = get().artikel.filter((a) => a.produktId !== produktId);
    set({ artikel });
    await speichern(artikel);
  },

  ersetzen: async (artikel) => {
    set({ artikel, geladen: true });
    await speichern(artikel);
  },

  leeren: async () => {
    set({ artikel: [], geladen: true });
    await speichern([]);
  },
}));
