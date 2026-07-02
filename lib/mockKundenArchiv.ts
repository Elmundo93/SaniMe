import type { Benutzer, Versorgung } from '../types';
import { MOCK_VERSORGUNGEN } from '../store/versorgungStore';

// Platzhalter für den noch fehlenden Kunden-Abgleich beim Backend: bildet nur eine
// Handvoll Bestandskunden nach, damit sich die Versicherten-Nr. von der Krankenkassenkarte
// gegen einen existierenden Kunden matchen lässt. Wie MOCK_PRODUKTE in mockOcr.ts nur ein
// Platzhalter für die Entwicklung, kein echter Datensatz.
interface ArchivEintrag {
  benutzer: Benutzer;
  versorgungen: Versorgung[];
}

const MOCK_ARCHIV: Record<string, ArchivEintrag> = {
  A123456789: {
    benutzer: {
      id: 'archiv-benutzer-001',
      vorname: 'Max',
      nachname: 'Mustermann',
      telefon: '+49 151 00000000',
      krankenkasse: 'Techniker Krankenkasse',
      versichertenNr: 'A123456789',
    },
    versorgungen: MOCK_VERSORGUNGEN,
  },
};

// Simulierter Archiv-Abgleich (in Produktion: Backend-Aufruf gegen den Kundenstamm).
export async function sucheKundeImArchiv(versichertenNr: string): Promise<ArchivEintrag | null> {
  await new Promise((r) => setTimeout(r, 600));
  const key = versichertenNr.trim().toUpperCase();
  return MOCK_ARCHIV[key] ?? null;
}
