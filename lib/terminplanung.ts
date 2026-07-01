import type { OnboardingSession, TerminSlot } from '../types';

const MOCK_ADRESSE = 'Musterstraße 12, 12345 Berlin';

function addBusinessDays(date: Date, tage: number): Date {
  const result = new Date(date);
  let hinzugefügt = 0;
  while (hinzugefügt < tage) {
    result.setDate(result.getDate() + 1);
    const wochentag = result.getDay();
    if (wochentag !== 0 && wochentag !== 6) hinzugefügt++;
  }
  return result;
}

function parseLieferzeitTage(lieferzeit: string | undefined): number {
  if (!lieferzeit) return 3;
  const match = lieferzeit.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
}

const ZEITFENSTER = [
  { start: 9, ende: 11 },
  { start: 13, ende: 15 },
  { start: 16, ende: 18 },
];

// Mock: ersetzt später echte Tourenplanung/Lagerbestand-API. Bearbeitungsdauer, Lieferzeit,
// Lagerbestand, Tourenplanung, Entfernung und Auslastung fließen konzeptionell ein, werden
// hier aber deterministisch aus Produkt + Session-ID abgeleitet statt einzeln simuliert —
// dieselbe Session liefert bei jedem Aufruf dieselben Vorschläge.
export function generiereTerminVorschlaege(session: OnboardingSession): TerminSlot[] {
  const bearbeitungstage = 1;
  const liefertage = parseLieferzeitTage(session.selectedSupply?.lieferzeit);
  const basis = addBusinessDays(new Date(), bearbeitungstage + liefertage);

  return [0, 2, 4].map((tageOffset, i) => {
    const tag = addBusinessDays(basis, tageOffset);
    const fenster = ZEITFENSTER[i % ZEITFENSTER.length];
    const beginn = new Date(tag);
    beginn.setHours(fenster.start, 0, 0, 0);
    const ende = new Date(tag);
    ende.setHours(fenster.ende, 0, 0, 0);
    return {
      id: `termin-${session.id}-${i}`,
      beginn: beginn.toISOString(),
      ende: ende.toISOString(),
      ort: MOCK_ADRESSE,
      hinweis: i === 0 ? 'Schnellster Termin' : undefined,
    };
  });
}

export function terminAusKalenderdatum(session: OnboardingSession, datum: Date): TerminSlot {
  const beginn = new Date(datum);
  beginn.setHours(13, 0, 0, 0);
  const ende = new Date(datum);
  ende.setHours(15, 0, 0, 0);
  return {
    id: `termin-${session.id}-kalender-${datum.toISOString().slice(0, 10)}`,
    beginn: beginn.toISOString(),
    ende: ende.toISOString(),
    ort: MOCK_ADRESSE,
  };
}
