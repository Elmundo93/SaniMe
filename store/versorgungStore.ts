import { create } from 'zustand';
import type { Versorgung } from '../types';
import * as supplyApi from '../lib/api/supply';
import { ApiError } from '../lib/api/client';
import { mapSupplyRowToVersorgung } from '../lib/supplyMapper';

interface VersorgungState {
  versorgungen: Versorgung[];
  laden: () => Promise<void>;
  zuruecksetzen: () => void;
}

export const useVersorgungStore = create<VersorgungState>((set) => ({
  versorgungen: [],

  laden: async () => {
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
    }
  },

  // Für einen unbekannten/ausgeloggten Nutzer (kein benutzer) darf das Dashboard
  // keine Versorgungen eines vorherigen Kunden weiter anzeigen.
  zuruecksetzen: () => set({ versorgungen: [] }),
}));
