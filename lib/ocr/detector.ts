import type { DokumentTyp } from './typen';

// Keyword-/Regex-Scoring auf reinem OCR-Fließtext (keine Bounding-Boxes
// verfügbar). Wird von lib/ocr/index.ts zum Gaten verwendet, um "falsches
// Dokument fotografiert" zu erkennen (siehe FalschesDokumentError).
const REZEPT_MARKER = ['muster 16', 'gesetzliche krankenvers', 'kassenrezept', 'lanr', 'bsnr', 'verordnung', 'gebühr'];
const EGK_MARKER = ['krankenversichertenkarte', 'gesundheitskarte', 'gültig bis', 'egk'];

const HILFSMITTELNUMMER = /\b\d{2}\.\d{2}\.\d{2}\b/;
const NEUNSTELLIGE_NUMMER = /\b\d{9}\b/;

export interface Erkennung {
  typ: DokumentTyp;
  score: number;
}

export function erkenneDokumenttyp(zeilen: string[]): Erkennung {
  const text = zeilen.join(' ').toLowerCase();

  let rezeptScore = REZEPT_MARKER.filter((marker) => text.includes(marker)).length;
  let egkScore = EGK_MARKER.filter((marker) => text.includes(marker)).length;

  if (HILFSMITTELNUMMER.test(text)) {
    rezeptScore += 1;
  }
  if (NEUNSTELLIGE_NUMMER.test(text)) {
    // Eine neunstellige Nummer ist auf beiden Dokumenten plausibel (LANR/BSNR
    // vs. IK) — zählt nur für die Seite, die bereits andere Marker hat.
    if (egkScore > 0) {
      egkScore += 1;
    } else {
      rezeptScore += 1;
    }
  }

  if (rezeptScore === 0 && egkScore === 0) {
    return { typ: 'UNBEKANNT', score: 0 };
  }
  return rezeptScore >= egkScore ? { typ: 'REZEPT', score: rezeptScore } : { typ: 'EGK', score: egkScore };
}
