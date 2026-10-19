import { create } from 'zustand';
import { getSecureJSON, setSecureJSON } from '../lib/secureStorage';

const KEY = 'sanime_merkliste';
// SecureStore-Werte sind auf Android auf ~2 KB begrenzt — 40 UUIDs passen sicher.
const MAX_EINTRAEGE = 40;

// Merkliste (Katalogplan §7): nur Produkt-IDs, nur auf diesem Gerät, verschlüsselt
// im SecureStore — eine Liste gemerkter Inkontinenzartikel ist faktisch ein
// Gesundheitsdatum. Kein Backend, keine Synchronisierung, keine Analytics.
interface MerklisteState {
  ids: string[];
  geladen: boolean;
  laden: () => Promise<void>;
  umschalten: (produktId: string) => Promise<void>;
}

export const useMerklisteStore = create<MerklisteState>((set, get) => ({
  ids: [],
  geladen: false,

  laden: async () => {
    if (get().geladen) return;
    try {
      set({ ids: (await getSecureJSON<string[]>(KEY)) ?? [], geladen: true });
    } catch {
      set({ ids: [], geladen: true });
    }
  },

  umschalten: async (produktId) => {
    const aktuell = get().ids;
    const ids = aktuell.includes(produktId)
      ? aktuell.filter((id) => id !== produktId)
      : [produktId, ...aktuell].slice(0, MAX_EINTRAEGE);
    set({ ids });
    try {
      await setSecureJSON(KEY, ids);
    } catch (e) {
      if (__DEV__) console.warn('[merkliste] Speichern fehlgeschlagen', e);
    }
  },
}));
