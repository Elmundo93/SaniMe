import { create } from 'zustand';
import type { Versorgung } from '../types';
import * as supplyApi from '../lib/api/supply';
import { ApiError } from '../lib/api/client';
import { mapSupplyRowToVersorgung } from '../lib/supplyMapper';

interface VersorgungState {
  versorgungen: Versorgung[];
  /** true, solange `laden()` läuft — die drei Start-Tabs zeigen dann ihr Skelett. */
  laedt: boolean;
  laden: () => Promise<void>;
  zuruecksetzen: () => void;
}

export const useVersorgungStore = create<VersorgungState>((set) => ({
  versorgungen: [],
  // Startet als true, damit vor dem ersten laden()-Aufruf kein leerer Zustand aufblitzt.
  laedt: true,

  laden: async () => {
    set({ laedt: true });
    try {
      const rows = await supplyApi.list();
      set({ versorgungen: rows.map(mapSupplyRowToVersorgung) });
    } catch (err) {
      // 403 = resolveOwnerFilter's fail-closed behavior for an unclaimed
      // session (apps/backend/.../current-principal.decorator.ts) — that's
      // "no customer to own a history yet", not an error to surface.
      if (err instanceof ApiError && err.status === 403) {
        set({ versorgungen: [] });
        return;
      }
      throw err;
    } finally {
      set({ laedt: false });
    }
  },

  // Für einen unbekannten/ausgeloggten Nutzer (kein benutzer) darf das Dashboard
  // keine Versorgungen eines vorherigen Kunden weiter anzeigen.
  zuruecksetzen: () => set({ versorgungen: [], laedt: false }),
}));
