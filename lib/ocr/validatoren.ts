import type { ConfidenceLevel } from '@sanime/domain';
import type { RezeptFelder } from './typen';

// Reine Prüffunktionen — passen nie den Kontrollfluss an, werfen nie. Ein
// fehlgeschlagener Check stuft lediglich die Confidence eines Feldes herab,
// der (weiterhin editierbare) Wert bleibt erhalten.

function ziffern(wert: string): number[] | null {
  const bereinigt = wert.replace(/\s/g, '');
  if (!/^\d{9}$/.test(bereinigt)) return null;
  return bereinigt.split('').map(Number);
}

// LANR (Lebenslange Arztnummer): Ziffern 1–6 gewichtet mit [4,9,4,9,4,9],
// Prüfziffer = (10 - (Summe mod 10)) mod 10, muss Ziffer 7 entsprechen.
export function pruefeLanr(lanr: string): boolean {
  const z = ziffern(lanr);
  if (!z) return false;
  const gewichte = [4, 9, 4, 9, 4, 9];
  const summe = gewichte.reduce((acc, gewicht, i) => acc + gewicht * z[i], 0);
  const pruefziffer = (10 - (summe % 10)) % 10;
  return pruefziffer === z[6];
}

// IK (Institutionskennzeichen): Ziffern 3–8 von links alternierend x2/x1,
// Produkte >= 10 als Quersumme, Prüfziffer = (10 - (Summe mod 10)) mod 10,
// muss Ziffer 9 entsprechen (gleiches Komplement-Schema wie bei der LANR).
export function pruefeIk(ik: string): boolean {
  const z = ziffern(ik);
  if (!z) return false;
  const relevant = z.slice(2, 8);
  let summe = 0;
  for (let i = 0; i < relevant.length; i++) {
    const gewicht = i % 2 === 0 ? 2 : 1;
    const produkt = relevant[i] * gewicht;
    summe += produkt >= 10 ? Math.floor(produkt / 10) + (produkt % 10) : produkt;
  }
  const pruefziffer = (10 - (summe % 10)) % 10;
  return pruefziffer === z[8];
}

// Krankenversichertennummer (unveränderlicher Teil, 10 Stellen): Buchstabe
// als zweistellige Zahl (A=01 … Z=26), dann die 8 Ziffern; diese 10 Ziffern
// abwechselnd x1/x2 gewichtet, Produkte >= 10 als Quersumme, Summe mod 10
// muss der Prüfziffer (Stelle 10) entsprechen.
export function pruefeVersichertenNr(nummer: string): boolean {
  const treffer = /^([A-Z])(\d{8})(\d)$/.exec(nummer.replace(/\s/g, '').toUpperCase());
  if (!treffer) return false;
  const buchstabe = String(treffer[1].charCodeAt(0) - 64).padStart(2, '0');
  const ziffernfolge = (buchstabe + treffer[2]).split('').map(Number);
  let summe = 0;
  ziffernfolge.forEach((ziffer, i) => {
    const produkt = ziffer * (i % 2 === 0 ? 1 : 2);
    summe += produkt >= 10 ? Math.floor(produkt / 10) + (produkt % 10) : produkt;
  });
  return summe % 10 === Number(treffer[3]);
}

function parseDatum(datum: string): Date | null {
  const treffer = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(datum.trim());
  if (!treffer) return null;
  const [, tagStr, monatStr, jahrStr] = treffer;
  const tag = Number(tagStr);
  const monat = Number(monatStr);
  const jahr = Number(jahrStr);
  const datumObj = new Date(jahr, monat - 1, tag);
  const gueltig = datumObj.getFullYear() === jahr && datumObj.getMonth() === monat - 1 && datumObj.getDate() === tag;
  return gueltig ? datumObj : null;
}

const TAG_IN_MS = 24 * 60 * 60 * 1000;

// Ausstellungsdatum: nicht in der Zukunft (Toleranz 1 Tag) und nicht älter
// als ein Jahr (ein Rezept ist ohnehin nur begrenzt gültig).
export function pruefeDatumPlausibel(datum: string, heute: Date = new Date()): boolean {
  const d = parseDatum(datum);
  if (!d) return false;
  const diffTage = (d.getTime() - heute.getTime()) / TAG_IN_MS;
  return diffTage <= 1 && diffTage >= -365;
}

// Geburtsdatum: in der Vergangenheit, impliziertes Alter zwischen 0 und 120.
export function pruefeGeburtsdatumPlausibel(datum: string, heute: Date = new Date()): boolean {
  const d = parseDatum(datum);
  if (!d) return false;
  if (d.getTime() > heute.getTime()) return false;
  const alterJahre = (heute.getTime() - d.getTime()) / (TAG_IN_MS * 365.25);
  return alterJahre >= 0 && alterJahre <= 120;
}

function eineStufeHerabstufen(confidence: ConfidenceLevel): ConfidenceLevel {
  return confidence === 'high' ? 'medium' : 'low';
}

// Wendet alle passenden Validatoren auf ein Parser-Ergebnis an. Nur
// Confidence-Anpassung, nie ein Werfen/Blockieren — der Nutzer sieht und
// korrigiert unsichere Felder ohnehin im Review-Screen.
export function wendeValidatorenAn(felder: RezeptFelder): RezeptFelder {
  const ergebnis = { ...felder };

  if (ergebnis.arztLanr.wert && !pruefeLanr(ergebnis.arztLanr.wert)) {
    ergebnis.arztLanr = { ...ergebnis.arztLanr, confidence: eineStufeHerabstufen(ergebnis.arztLanr.confidence) };
  }
  if (ergebnis.versichertenNr.wert && !pruefeVersichertenNr(ergebnis.versichertenNr.wert)) {
    ergebnis.versichertenNr = { ...ergebnis.versichertenNr, confidence: 'low' };
  }
  if (ergebnis.ik.wert && !pruefeIk(ergebnis.ik.wert)) {
    ergebnis.ik = { ...ergebnis.ik, confidence: eineStufeHerabstufen(ergebnis.ik.confidence) };
  }
  if (ergebnis.datum.wert && !pruefeDatumPlausibel(ergebnis.datum.wert)) {
    ergebnis.datum = { ...ergebnis.datum, confidence: eineStufeHerabstufen(ergebnis.datum.confidence) };
  }
  if (ergebnis.patientGeburtsdatum.wert && !pruefeGeburtsdatumPlausibel(ergebnis.patientGeburtsdatum.wert)) {
    ergebnis.patientGeburtsdatum = {
      ...ergebnis.patientGeburtsdatum,
      confidence: eineStufeHerabstufen(ergebnis.patientGeburtsdatum.confidence),
    };
  }

  return ergebnis;
}

// Ampel für Felder ohne eigene OCR-Confidence (LANR, IK, Versichertennummer,
// Ausstellungsdatum): grün nur mit bestandener Prüfung, sonst „bitte prüfen“.
// Wird nach jeder Korrektur neu berechnet; leer = keine Ampel.
export function pruefAmpel(wert: string | undefined, gueltig: (wert: string) => boolean): ConfidenceLevel | undefined {
  if (!wert) return undefined;
  return gueltig(wert) ? 'high' : 'medium';
}
