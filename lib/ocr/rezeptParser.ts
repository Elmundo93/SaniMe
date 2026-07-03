import type { ConfidenceLevel } from '../../types';
import { pruefeGeburtsdatumPlausibel } from './validatoren';
import type { FeldResultat, RezeptFelder } from './typen';

// Extrahiert die Muster-16-Felder aus dem rohen OCR-Zeilenarray. Reine
// Keyword-/Regex-Heuristik ohne Positions-/Bounding-Box-Wissen — bewusst
// konservativ: ein nicht gefundenes Feld liefert '' + 'low' statt zu raten,
// damit der Nutzer es im Review-Screen von Hand nachträgt.

const DATUM_GLOBAL = /\b(\d{2})\.(\d{2})\.(\d{4})\b/g;
const DATUM_EINZELN = /\b\d{2}\.\d{2}\.\d{4}\b/;
const NEUNSTELLIG_GLOBAL = /\b\d{9}\b/g;
const NEUNSTELLIG_EINZELN = /\b\d{9}\b/;
const ICD10_REGEX = /\b[A-TV-Z]\d{2}(?:\.\d{1,2})?\b/;
const HILFSMITTELNUMMER_REGEX = /\b\d{2}\.\d{2}\.\d{2}(?:\.\d{4})?\b/;
const NAME_REGEX = /^[A-ZÄÖÜ][\wÄÖÜäöüß.-]*,?\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]*$/;

const GEBURTS_ANKER = ['geb.', 'geboren', 'geb '];
const ARZT_ANKER = ['dr.', 'dr ', 'med.', 'fachärzt', 'praxis'];
const LANR_LABEL = ['lanr'];
const BSNR_LABEL = ['bsnr'];
const DIAGNOSE_ANKER = ['diagnose', 'dx', 'icd'];
const HILFSMITTEL_KEYWORDS = [
  'rollstuhl',
  'gehhilfe',
  'rollator',
  'bandage',
  'prothese',
  'orthese',
  'einlage',
  'kompressionsstrumpf',
  'hörgerät',
  'gehstock',
  'toilettensitz',
  'pflegebett',
];

const TAG_IN_MS = 24 * 60 * 60 * 1000;
const AUSSTELLUNG_TOLERANZ_TAGE = 400;

interface DatumTreffer {
  datum: string;
  zeilenIndex: number;
  tag: number;
  monat: number;
  jahr: number;
}

interface LanrTreffer {
  feld: FeldResultat;
  zeilenIndex: number | null;
}

function leer(): FeldResultat {
  return { wert: '', confidence: 'low' };
}

function sammleDatumsTreffer(zeilen: string[]): DatumTreffer[] {
  const treffer: DatumTreffer[] = [];
  zeilen.forEach((zeile, index) => {
    for (const match of zeile.matchAll(DATUM_GLOBAL)) {
      treffer.push({ datum: match[0], zeilenIndex: index, tag: Number(match[1]), monat: Number(match[2]), jahr: Number(match[3]) });
    }
  });
  return treffer;
}

function waehleGeburtsdatum(
  treffer: DatumTreffer[],
  zeilen: string[],
  heute: Date,
): { feld: FeldResultat; treffer: DatumTreffer | null } {
  const plausibel = treffer.filter((t) => pruefeGeburtsdatumPlausibel(t.datum, heute));
  if (plausibel.length === 0) return { feld: leer(), treffer: null };

  const sortiert = [...plausibel].sort((a, b) => a.jahr - b.jahr || a.monat - b.monat || a.tag - b.tag);
  const kandidat = sortiert[0];
  const zeileDavor = zeilen[kandidat.zeilenIndex - 1]?.toLowerCase() ?? '';
  const zeileGleich = zeilen[kandidat.zeilenIndex]?.toLowerCase() ?? '';
  const anker = GEBURTS_ANKER.some((a) => zeileDavor.includes(a) || zeileGleich.includes(a));
  const confidence: ConfidenceLevel = plausibel.length === 1 && anker ? 'high' : 'medium';
  return { feld: { wert: kandidat.datum, confidence }, treffer: kandidat };
}

function waehleAusstellungsdatum(treffer: DatumTreffer[], geburtsdatum: string, heute: Date): FeldResultat {
  const kandidaten = treffer
    .filter((t) => t.datum !== geburtsdatum)
    .map((t) => ({ t, diffTage: Math.abs((new Date(t.jahr, t.monat - 1, t.tag).getTime() - heute.getTime()) / TAG_IN_MS) }))
    .filter((k) => k.diffTage <= AUSSTELLUNG_TOLERANZ_TAGE)
    .sort((a, b) => a.diffTage - b.diffTage);

  if (kandidaten.length === 0) return leer();
  const confidence: ConfidenceLevel = kandidaten.length === 1 ? 'high' : 'medium';
  return { wert: kandidaten[0].t.datum, confidence };
}

function waehlePatientName(zeilen: string[], geburtsdatumTreffer: DatumTreffer | null): FeldResultat {
  if (!geburtsdatumTreffer) return leer();
  const untereGrenze = Math.max(0, geburtsdatumTreffer.zeilenIndex - 2);
  for (let i = geburtsdatumTreffer.zeilenIndex - 1; i >= untereGrenze; i--) {
    const zeile = zeilen[i];
    if (zeile && NAME_REGEX.test(zeile)) {
      return { wert: zeile.trim(), confidence: 'medium' };
    }
  }
  return leer();
}

function waehleLanr(zeilen: string[]): LanrTreffer {
  const kandidaten: { wert: string; zeilenIndex: number }[] = [];
  zeilen.forEach((zeile, index) => {
    for (const match of zeile.matchAll(NEUNSTELLIG_GLOBAL)) {
      kandidaten.push({ wert: match[0], zeilenIndex: index });
    }
  });
  if (kandidaten.length === 0) return { feld: leer(), zeilenIndex: null };

  const mitLabel = kandidaten.find((k) => {
    const zeile = zeilen[k.zeilenIndex].toLowerCase();
    return LANR_LABEL.some((l) => zeile.includes(l)) && !BSNR_LABEL.some((l) => zeile.includes(l));
  });
  const kandidat = mitLabel ?? kandidaten[0];
  const confidence: ConfidenceLevel = mitLabel ? 'high' : kandidaten.length === 1 ? 'medium' : 'low';
  return { feld: { wert: kandidat.wert, confidence }, zeilenIndex: kandidat.zeilenIndex };
}

function waehleArztName(zeilen: string[], lanrTreffer: LanrTreffer): FeldResultat {
  const ankerZeile = zeilen.find((z) => ARZT_ANKER.some((a) => z.toLowerCase().includes(a)));
  if (ankerZeile) return { wert: ankerZeile.trim(), confidence: 'medium' };

  if (lanrTreffer.zeilenIndex !== null) {
    for (let i = lanrTreffer.zeilenIndex - 1; i >= 0; i--) {
      const zeile = zeilen[i]?.trim();
      if (zeile) return { wert: zeile, confidence: 'medium' };
    }
  }
  return leer();
}

function waehleDiagnose(zeilen: string[]): FeldResultat {
  for (let i = 0; i < zeilen.length; i++) {
    const treffer = ICD10_REGEX.exec(zeilen[i]);
    if (treffer) {
      const rest = zeilen[i].slice(treffer.index + treffer[0].length).trim();
      const zusatz = rest || zeilen[i + 1]?.trim() || '';
      return { wert: zusatz ? `${treffer[0]} — ${zusatz}` : treffer[0], confidence: 'high' };
    }
  }
  const ankerIndex = zeilen.findIndex((z) => DIAGNOSE_ANKER.some((a) => z.toLowerCase().includes(a)));
  if (ankerIndex !== -1) {
    const wert = zeilen[ankerIndex + 1]?.trim() ?? '';
    return wert ? { wert, confidence: 'medium' } : leer();
  }
  return leer();
}

function istStrukturiert(zeile: string): boolean {
  return DATUM_EINZELN.test(zeile) || NEUNSTELLIG_EINZELN.test(zeile) || HILFSMITTELNUMMER_REGEX.test(zeile) || ICD10_REGEX.test(zeile);
}

function waehleHilfsmittel(zeilen: string[]): FeldResultat {
  const keywordZeile = zeilen.find((z) => HILFSMITTEL_KEYWORDS.some((k) => z.toLowerCase().includes(k)));
  if (keywordZeile) return { wert: keywordZeile.trim(), confidence: 'medium' };

  const unstrukturiert = zeilen.filter((z) => z.length > 8 && !istStrukturiert(z));
  if (unstrukturiert.length === 0) return leer();
  const laengste = unstrukturiert.reduce((a, b) => (b.length > a.length ? b : a));
  return { wert: laengste.trim(), confidence: 'medium' };
}

function waehleHilfsmittelNr(zeilen: string[]): FeldResultat {
  for (const zeile of zeilen) {
    const treffer = HILFSMITTELNUMMER_REGEX.exec(zeile);
    if (treffer) return { wert: treffer[0], confidence: 'high' };
  }
  return leer();
}

export function parseRezept(zeilen: string[], heute: Date = new Date()): RezeptFelder {
  const bereinigteZeilen = zeilen.map((z) => z.trim()).filter((z) => z.length > 0);
  const datumsTreffer = sammleDatumsTreffer(bereinigteZeilen);

  const { feld: patientGeburtsdatum, treffer: geburtsdatumTreffer } = waehleGeburtsdatum(datumsTreffer, bereinigteZeilen, heute);
  const datum = waehleAusstellungsdatum(datumsTreffer, patientGeburtsdatum.wert, heute);
  const patientName = waehlePatientName(bereinigteZeilen, geburtsdatumTreffer);
  const lanrTreffer = waehleLanr(bereinigteZeilen);
  const arztName = waehleArztName(bereinigteZeilen, lanrTreffer);
  const diagnose = waehleDiagnose(bereinigteZeilen);
  const hilfsmittel = waehleHilfsmittel(bereinigteZeilen);
  const hilfsmittelNr = waehleHilfsmittelNr(bereinigteZeilen);

  return {
    patientName,
    patientGeburtsdatum,
    arztName,
    arztLanr: lanrTreffer.feld,
    diagnose,
    hilfsmittel,
    hilfsmittelNr,
    datum,
  };
}
