import { pruefeIk } from './validatoren';
import type { EgkFelder, FeldResultat } from './typen';

// Extrahiert die Felder einer elektronischen Gesundheitskarte (eGK) aus dem
// rohen OCR-Zeilenarray. Analog zu rezeptParser.ts: nicht gefundene Felder
// liefern '' + 'low' statt zu raten, der Nutzer korrigiert im Review-Screen.

const VERSICHERTENNUMMER_REGEX = /\b[A-Z]\d{9}\b/;
const NEUNSTELLIG_GLOBAL = /\b\d{9}\b/g;

const KRANKENKASSEN_NAMEN = [
  'techniker krankenkasse',
  'barmer',
  'dak-gesundheit',
  'knappschaft',
  'ikk',
  'bkk',
  'hkk',
  'hek',
  'kkh',
  'securvita',
  'big direkt gesund',
  'novitas bkk',
  'audi bkk',
  'salus bkk',
  'viactiv',
  'mhplus',
  'pronova bkk',
  'sbk',
  'energie-bkk',
  'aok',
];

function leer(): FeldResultat {
  return { wert: '', confidence: 'low' };
}

function waehleVersichertenNr(zeilen: string[]): FeldResultat {
  for (const zeile of zeilen) {
    const treffer = VERSICHERTENNUMMER_REGEX.exec(zeile.toUpperCase());
    if (treffer) return { wert: treffer[0], confidence: 'high' };
  }
  return leer();
}

function waehleIk(zeilen: string[], versichertenNr: string): FeldResultat {
  for (const zeile of zeilen) {
    for (const treffer of zeile.matchAll(NEUNSTELLIG_GLOBAL)) {
      // Ausschließen, falls diese Ziffernfolge Teil der Versichertennummer ist
      // (Buchstabe + 9 Ziffern) statt einer eigenständigen IK.
      if (versichertenNr && versichertenNr.slice(1) === treffer[0]) continue;
      return { wert: treffer[0], confidence: pruefeIk(treffer[0]) ? 'high' : 'medium' };
    }
  }
  return leer();
}

function waehleKrankenkasseName(zeilen: string[]): FeldResultat {
  const bekannt = zeilen.find((z) => KRANKENKASSEN_NAMEN.some((name) => z.toLowerCase().includes(name)));
  if (bekannt) return { wert: bekannt.trim(), confidence: 'high' };

  const kandidat = zeilen.find(
    (z) => z.length >= 3 && z.length <= 40 && /[a-zA-ZÄÖÜäöüß]/.test(z) && !VERSICHERTENNUMMER_REGEX.test(z.toUpperCase()),
  );
  return kandidat ? { wert: kandidat.trim(), confidence: 'medium' } : leer();
}

export function parseEgk(zeilen: string[]): EgkFelder {
  const bereinigteZeilen = zeilen.map((z) => z.trim()).filter((z) => z.length > 0);

  const versichertenNr = waehleVersichertenNr(bereinigteZeilen);
  const ik = waehleIk(bereinigteZeilen, versichertenNr.wert);
  const krankenkasseName = waehleKrankenkasseName(bereinigteZeilen);

  return { krankenkasseName, versichertenNr, ik };
}
