import { create } from 'zustand';
import type { OnboardingSession, Versorgung } from '../types';

// Mock-Daten für die Entwicklung — auch von lib/mockKundenArchiv.ts als Bestandskunden-
// Historie wiederverwendet, statt sie dort ein zweites Mal zu pflegen.
export const MOCK_VERSORGUNGEN: Versorgung[] = [
  {
    id: 'v-001',
    status: 'PENDING_INSURANCE',
    produkt: 'Rollstuhl Aktiv SB 40',
    hilfsmittelNr: '18.50.03.0001',
    arzt: 'Dr. med. Sabine Müller',
    krankenkasse: 'Techniker Krankenkasse',
    erstellt: '2026-06-20T09:10:00Z',
    aktualisiert: '2026-06-27T11:14:00Z',
    lieferadresse: 'Musterstraße 12, 12345 Berlin',
    hersteller: 'Sunrise Medical',
    ansprechpartner: 'Dein SaniMe-Team',
    lieferzeit: '5-7 Werktage',
    offeneAktionen: [
      {
        id: 'oa-001-1',
        titel: 'Rückfrage der Krankenkasse',
        beschreibung: 'Die Techniker Krankenkasse benötigt eine zusätzliche Unterschrift von dir.',
        typ: 'formular',
      },
    ],
    timeline: [
      {
        id: 'tl-001-1',
        status: 'PENDING_REVIEW',
        label: 'Rezept eingegangen',
        beschreibung: 'Ihr Rezept wurde erfolgreich hochgeladen.',
        zeitpunkt: '2026-06-20T09:10:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-001-2',
        status: 'PENDING_REVIEW',
        label: 'Prüfung abgeschlossen',
        beschreibung: 'Ihre Unterlagen wurden geprüft und sind vollständig.',
        zeitpunkt: '2026-06-20T09:25:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-001-3',
        status: 'PENDING_INSURANCE',
        label: 'An Krankenkasse gesendet',
        beschreibung: 'Wir haben Ihren Antrag an die Techniker Krankenkasse übermittelt.',
        zeitpunkt: '2026-06-20T11:14:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-001-4',
        status: 'APPROVED',
        label: 'Genehmigung',
        beschreibung: 'Wir warten auf die Rückmeldung der Krankenkasse.',
        zeitpunkt: '',
        abgeschlossen: false,
      },
    ],
  },
  {
    id: 'v-002',
    status: 'DELIVERED',
    produkt: 'Kompressionsstrümpfe Klasse II',
    hilfsmittelNr: '17.10.01.0001',
    arzt: 'Dr. med. Klaus Weber',
    krankenkasse: 'AOK Bayern',
    erstellt: '2026-05-15T14:00:00Z',
    aktualisiert: '2026-05-29T12:00:00Z',
    lieferadresse: 'Musterstraße 12, 12345 Berlin',
    hersteller: 'medi',
    ansprechpartner: 'Dein SaniMe-Team',
    lieferzeit: '2-3 Werktage',
    offeneAktionen: [],
    timeline: [
      {
        id: 'tl-002-1',
        status: 'PENDING_REVIEW',
        label: 'Rezept eingegangen',
        beschreibung: 'Ihr Rezept wurde erfolgreich hochgeladen.',
        zeitpunkt: '2026-05-15T14:00:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-002-2',
        status: 'APPROVED',
        label: 'Genehmigt',
        beschreibung: 'Ihre Versorgung wurde von der AOK Bayern genehmigt.',
        zeitpunkt: '2026-05-20T10:00:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-002-3',
        status: 'SHIPPED',
        label: 'Versandt',
        beschreibung: 'Ihr Paket wurde an DHL übergeben.',
        zeitpunkt: '2026-05-27T08:00:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-002-4',
        status: 'DELIVERED',
        label: 'Zugestellt',
        beschreibung: 'Ihre Versorgung wurde erfolgreich zugestellt.',
        zeitpunkt: '2026-05-29T12:00:00Z',
        abgeschlossen: true,
      },
    ],
  },
  {
    id: 'v-003',
    status: 'PROCESSING',
    produkt: 'Badewannenlift Aqua Comfort',
    hilfsmittelNr: '04.40.02.0002',
    arzt: 'Dr. med. Sabine Müller',
    krankenkasse: 'Techniker Krankenkasse',
    erstellt: '2026-06-10T08:30:00Z',
    aktualisiert: '2026-06-29T09:00:00Z',
    lieferadresse: 'Musterstraße 12, 12345 Berlin',
    hersteller: 'Invacare',
    ansprechpartner: 'Dein SaniMe-Team',
    lieferzeit: '3-5 Werktage',
    offeneAktionen: [],
    timeline: [
      {
        id: 'tl-003-1',
        status: 'PENDING_REVIEW',
        label: 'Rezept eingegangen',
        beschreibung: 'Ihr Rezept wurde erfolgreich hochgeladen.',
        zeitpunkt: '2026-06-10T08:30:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-003-2',
        status: 'APPROVED',
        label: 'Genehmigt',
        beschreibung: 'Ihre Versorgung wurde von der Techniker Krankenkasse genehmigt.',
        zeitpunkt: '2026-06-22T10:00:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-003-3',
        status: 'PROCESSING',
        label: 'In Vorbereitung',
        beschreibung: 'Ihre Bestellung wird für den Versand vorbereitet.',
        zeitpunkt: '2026-06-29T09:00:00Z',
        abgeschlossen: true,
      },
      {
        id: 'tl-003-4',
        status: 'SHIPPED',
        label: 'Versand',
        beschreibung: 'Ihr Paket ist unterwegs.',
        zeitpunkt: '',
        abgeschlossen: false,
      },
    ],
  },
];

// Baut den eigentlichen Auftrag erst nach erfolgreichem Checkout aus der OnboardingSession —
// vor Checkout-Erfolg existiert keine Versorgung, nur die Session (work/onboardingsprint.md, Zeile 81).
export function baueVersorgungAusSession(session: OnboardingSession, versorgungId: string): Versorgung {
  const produkt = session.selectedSupply;
  const ocr = session.ocrResult;
  if (!produkt || !ocr) {
    throw new Error('OnboardingSession unvollständig: Versorgung kann nicht erstellt werden');
  }
  const jetzt = session.aktualisiert;
  return {
    id: versorgungId,
    status: 'PENDING_REVIEW',
    produkt: produkt.name,
    hilfsmittelNr: produkt.hilfsmittelNr,
    arzt: ocr.arzt.name,
    krankenkasse: ocr.krankenkasse.name,
    erstellt: jetzt,
    aktualisiert: jetzt,
    lieferadresse: 'Musterstraße 12, 12345 Berlin',
    hersteller: produkt.hersteller,
    ansprechpartner: 'Dein SaniMe-Team',
    lieferzeit: produkt.lieferzeit,
    offeneAktionen: [],
    timeline: [
      {
        id: `${versorgungId}-tl-1`,
        status: 'PENDING_REVIEW',
        label: 'Rezept eingegangen',
        beschreibung: 'Ihr Rezept wurde erfolgreich hochgeladen und wird geprüft.',
        zeitpunkt: jetzt,
        abgeschlossen: true,
      },
      {
        id: `${versorgungId}-tl-2`,
        status: 'PENDING_INSURANCE',
        label: 'Krankenkasse kontaktieren',
        beschreibung: 'Wir kontaktieren Ihre Krankenkasse zur Genehmigung.',
        zeitpunkt: '',
        abgeschlossen: false,
      },
      {
        id: `${versorgungId}-tl-3`,
        status: 'APPROVED',
        label: 'Genehmigung',
        beschreibung: 'Wir warten auf die Rückmeldung der Krankenkasse.',
        zeitpunkt: '',
        abgeschlossen: false,
      },
    ],
  };
}

interface VersorgungState {
  versorgungen: Versorgung[];
  laden: () => Promise<void>;
  versorgungHinzufügen: (versorgung: Versorgung) => void;
  versorgungenSetzen: (versorgungen: Versorgung[]) => void;
  zuruecksetzen: () => void;
}

export const useVersorgungStore = create<VersorgungState>((set) => ({
  versorgungen: [],

  laden: async () => {
    // In Produktion: API-Aufruf
    await new Promise((resolve) => setTimeout(resolve, 500));
    set({ versorgungen: MOCK_VERSORGUNGEN });
  },

  versorgungHinzufügen: (versorgung) =>
    set((state) => ({
      versorgungen: [versorgung, ...state.versorgungen],
    })),

  // Setzt die Historie eines per Archiv-Abgleich erkannten Bestandskunden (siehe
  // lib/mockKundenArchiv.ts) — anders als laden() kein generischer Mock-Fallback,
  // sondern die tatsächlich zum gematchten Kunden gehörende Liste.
  versorgungenSetzen: (versorgungen) => set({ versorgungen }),

  // Für einen unbekannten/ausgeloggten Nutzer (kein benutzer) darf das Dashboard
  // keine Versorgungen eines vorherigen Kunden weiter anzeigen.
  zuruecksetzen: () => set({ versorgungen: [] }),
}));
