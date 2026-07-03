import type { ConfidenceLevel, OcrConfidence, OcrKrankenkasse, OcrResult, Produkt } from '@sanime/domain';

// Mock-OCR, aufgeteilt auf die beiden Dokumente: Rezeptaufnahme liefert die
// Rezept-/Patientenfelder, Krankenkassenaufnahme liefert die Kassen-Felder. In
// Produktion: jeweils ein API-Aufruf pro Dokument statt setTimeout.
export async function simuliereRezeptOcr(): Promise<{ result: OcrResult; confidence: OcrConfidence }> {
  await new Promise((r) => setTimeout(r, 2200));

  return {
    result: {
      patient: { name: 'Max Mustermann', dateOfBirth: '15.03.1972' },
      arzt: { name: 'Dr. med. Sabine Müller', lanr: '123456700' },
      krankenkasse: { name: '', versichertenNr: '' },
      diagnose: 'G82.1 — Paraplegie, schlaff',
      hilfsmittel: 'Rollstuhl, faltbar, Sitzbreite 40 cm',
      hilfsmittelNr: '00.00.00',
      datum: '15.06.2026',
    },
    confidence: {
      patient: 'high',
      arzt: 'high',
      krankenkasse: 'low',
      diagnose: 'medium',
      hilfsmittel: 'high',
    },
  };
}

export async function simuliereKrankenkasseOcr(): Promise<{ krankenkasse: OcrKrankenkasse; confidence: ConfidenceLevel; produkte: Produkt[] }> {
  await new Promise((r) => setTimeout(r, 1500));

  return {
    krankenkasse: {
      name: 'Techniker Krankenkasse',
      ik: '260940566',
      versichertenNr: 'A123456789',
    },
    confidence: 'high',
    produkte: MOCK_PRODUKTE,
  };
}

export const MOCK_PRODUKTE: Produkt[] = [
  {
    id: 'p-001',
    name: 'Rollstuhl Aktiv SB 40 — Basisversorgung',
    hersteller: 'MobilTech',
    hilfsmittelNr: '00.00.00.0001',
    beschreibung: 'Leichter Standardrollstuhl, faltbar, Sitzbreite 40 cm. Für den Alltag geeignet.',
    eigenanteil: 10.0,
    lieferzeit: '3–5 Werktage',
    kategorie: 'Rollstuhl',
    merkmale: ['Faltbar', 'Leichtgewicht 13 kg', 'Bremsgriffe', 'Fußrasten verstellbar'],
  },
  {
    id: 'p-002',
    name: 'Rollstuhl Komfort Plus SB 40',
    hersteller: 'AktivCare',
    hilfsmittelNr: '00.00.00.0012',
    beschreibung:
      'Komfortrollstuhl mit verbesserter Polsterung und einstellbarer Rückenlehne. Ideal für längeres Sitzen.',
    eigenanteil: 10.0,
    lieferzeit: '5–7 Werktage',
    kategorie: 'Rollstuhl',
    merkmale: ['Faltbar', 'Ergonomische Rückenlehne', 'Anti-Dekubituspolsterung', 'Schwenkbare Fußrasten'],
  },
  {
    id: 'p-003',
    name: 'Rollstuhl Leichtgewicht Aluminium',
    hersteller: 'FlexMed',
    hilfsmittelNr: '00.00.00.0025',
    beschreibung:
      'Ultraleichter Aluminiumrollstuhl (10 kg), ideal für aktive Personen und häufigen Transport.',
    eigenanteil: 45.0,
    lieferzeit: '7–10 Werktage',
    kategorie: 'Rollstuhl',
    merkmale: ['Faltbar', 'Nur 10 kg', 'Aluminium-Rahmen', 'Selbstanhebbares Fußteil', 'Trommelbremsen'],
  },
];
