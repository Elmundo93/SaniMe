import type { ConfidenceLevel } from '@sanime/domain';
import { KRANKENKASSEN_NAMEN } from './egkParser';
import { pruefeGeburtsdatumPlausibel, pruefeIk, pruefeLanr } from './validatoren';
import type { FeldResultat, RezeptFelder, RezeptHinweis } from './typen';

// Extrahiert die Muster-16-Felder aus dem rohen OCR-Zeilenarray (ohne
// Bounding-Boxes). Primär über die gedruckten Feldbeschriftungen des
// Formulars („Name, Vorname des Versicherten“, „Arzt-Nr.“, „Datum“, „Rp.“ …):
// der Wert steht in der Lesereihenfolge direkt hinter seiner Beschriftung.
// Das schließt Text außerhalb des Formulars aus (z.B. ein zweites Dokument
// im Bildhintergrund). Fehlen die Beschriftungen, greift die ältere
// Stichwort-Heuristik. Bewusst konservativ: ein nicht gefundenes Feld
// liefert '' + 'low' statt zu raten, der Nutzer trägt es im Review nach.

// Ohne führendes \b: der senkrechte Feldstrich vor dem Datum wird oft als
// „1“ gelesen („106.07.26“) — so trifft die Regex trotzdem „06.07.26“.
const DATUM_GLOBAL = /(\d{2})\.(\d{2})\.(\d{4}|\d{2})(?!\d)/g;
const DATUM_EINZELN = /\b\d{2}\.\d{2}\.\d{2,4}\b/;
const NEUNSTELLIG_EINZELN = /\b\d{9}\b/;
const VERSICHERTENNR_GLOBAL = /(?:^|[^A-Za-z])([A-Z]\d{9})(?!\d)/g;
const ICD10_REGEX = /\b[A-TV-Z]\d{2}(?:\.\d{1,2})?\b/;
const HILFSMITTELNUMMER_GLOBAL = /\b\d{2}\.\d{2}\.\d{2}(?:\.\d{1,4})?\b/g;
const HILFSMITTELNUMMER_EINZELN = /\b\d{2}\.\d{2}\.\d{2}(?:\.\d{1,4})?\b/;
const NAME_REGEX = /^[A-ZÄÖÜ][\wÄÖÜäöüß.-]*,?\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]*$/;
const NAMENSZEILE = /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß' .,-]+$/;
const DATUMSZEILE = /^\D{0,2}\d{2}\.\d{2}\.\d{2,4}$/;
// Zwei direkt aneinandergelesene neunstellige Nummern (BSNR + LANR).
const ZIFFERNFOLGE_GLOBAL = /\d+/g;
// Eine Zeile, die nur aus einem Euro-Betrag besteht (Taxe/Gesamt-Brutto).
const BETRAGSZEILE = /^\d{1,4},\d{2}\W*$/;

// Feldbeschriftungen des Muster 16 — Anker für die Wertsuche und zugleich
// Zeilen, die selbst nie ein Wert sind.
const ANKER = {
  kasse: /krankenkasse bzw/i,
  name: /name,\s*vorname/i,
  geburt: /geb\.?\s*am\b/i,
  kostentraeger: /kostentr[äa]gerkennung/i,
  arztNr: /arzt-?\s?nr/i,
  datum: /^datum$/i,
  rp: /^rp\b/i,
  stempel: /vertragsarztstempel/i,
};
const BESCHRIFTUNGEN = [
  ...Object.values(ANKER),
  /versicherten-?\s?nr/i,
  /^status$/i,
  /betriebsst/i,
  /apotheken/i,
  /\bbvg\b/i,
  /verordnung/i,
  /zuzahlung/i,
  /gesamt.?brutto/i,
  /^faktor$/i,
  /^taxe$/i,
  /unfall/i,
  /abgabedatum/i,
];
// Ankreuzfelder „aut idem“ links neben dem Verordnungsfeld, wie Vision sie liest.
const AUT_IDEM_RAUSCHEN = /^(aut|idem|dem|cem|ldem|aut idem)$/i;
const RP_ENDE = /bei arb|arbeitsunfall|abgabedatum|unfalltag|unfallbetrieb|vertragsarztstempel|gesamt.?brutto|\*{3,}/i;

const GEBURTS_ANKER = ['geb.', 'geboren', 'geb '];
const ARZT_ANKER_TITEL = /\b(dr|prof)\b\.?/i;
const ARZT_ANKER_PRAXIS = ['med.', 'fachärzt', 'praxis'];
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
  'unterarmgehstütze',
  'toilettensitz',
  'duschhocker',
  'badewannenlifter',
  'pflegebett',
  'inkontinenz',
];

const TAG_IN_MS = 24 * 60 * 60 * 1000;
const AUSSTELLUNG_TOLERANZ_TAGE = 400;
// Hilfsmittel-Richtlinie: die Versorgung muss innerhalb von 28 Kalendertagen
// nach Ausstellung beginnen, sonst verliert die Verordnung ihre Gültigkeit
// (fachlich noch zu bestätigen — deshalb nur ein Hinweis, keine Sperre).
const GUELTIGKEIT_TAGE = 28;
const ANKER_FENSTER = 4;

type DatumsArt = 'geburt' | 'ausstellung';

interface DatumTreffer {
  datum: string;
  zeilenIndex: number;
  zeit: number;
}

interface LanrTreffer {
  feld: FeldResultat;
  zeilenIndex: number | null;
}

function leer(): FeldResultat {
  return { wert: '', confidence: 'low' };
}

function istBeschriftung(zeile: string): boolean {
  return BESCHRIFTUNGEN.some((b) => b.test(zeile));
}

function findeAnker(zeilen: string[], anker: RegExp, ab = 0): number {
  for (let i = ab; i < zeilen.length; i++) {
    if (anker.test(zeilen[i])) return i;
  }
  return -1;
}

// Liefert TT.MM.JJJJ oder null für ein ungültiges Datum. Muster 16 druckt
// zweistellige Jahre: ein Geburtsjahr in der Zukunft gehört ins 20. Jh.
function normalisiereDatum(tag: string, monat: string, jahr: string, art: DatumsArt, heute: Date): string | null {
  let jahrZahl = Number(jahr);
  if (jahr.length === 2) {
    jahrZahl += 2000;
    if (art === 'geburt' && jahrZahl > heute.getFullYear()) jahrZahl -= 100;
  }
  const d = new Date(jahrZahl, Number(monat) - 1, Number(tag));
  if (d.getFullYear() !== jahrZahl || d.getMonth() !== Number(monat) - 1 || d.getDate() !== Number(tag)) return null;
  return `${tag}.${monat}.${jahrZahl}`;
}

function datumsInZeile(zeile: string, zeilenIndex: number, art: DatumsArt, heute: Date): DatumTreffer[] {
  const treffer: DatumTreffer[] = [];
  for (const match of zeile.matchAll(DATUM_GLOBAL)) {
    const datum = normalisiereDatum(match[1], match[2], match[3], art, heute);
    if (!datum) continue;
    const [t, m, j] = datum.split('.').map(Number);
    treffer.push({ datum, zeilenIndex, zeit: new Date(j, m - 1, t).getTime() });
  }
  return treffer;
}

function datumNachAnker(zeilen: string[], anker: RegExp, art: DatumsArt, heute: Date): DatumTreffer | null {
  const index = findeAnker(zeilen, anker);
  if (index === -1) return null;
  for (let i = index; i <= Math.min(index + ANKER_FENSTER, zeilen.length - 1); i++) {
    const treffer = datumsInZeile(zeilen[i], i, art, heute)[0];
    if (treffer) return treffer;
  }
  return null;
}

function sammleDatumsTreffer(zeilen: string[], art: DatumsArt, heute: Date): DatumTreffer[] {
  return zeilen.flatMap((zeile, index) => datumsInZeile(zeile, index, art, heute));
}

function waehleGeburtsdatum(zeilen: string[], heute: Date): { feld: FeldResultat; treffer: DatumTreffer | null } {
  const amAnker = datumNachAnker(zeilen, ANKER.geburt, 'geburt', heute);
  if (amAnker && pruefeGeburtsdatumPlausibel(amAnker.datum, heute)) {
    return { feld: { wert: amAnker.datum, confidence: 'high' }, treffer: amAnker };
  }

  const plausibel = sammleDatumsTreffer(zeilen, 'geburt', heute).filter((t) => pruefeGeburtsdatumPlausibel(t.datum, heute));
  if (plausibel.length === 0) return { feld: leer(), treffer: null };

  const kandidat = [...plausibel].sort((a, b) => a.zeit - b.zeit)[0];
  const zeileDavor = zeilen[kandidat.zeilenIndex - 1]?.toLowerCase() ?? '';
  const zeileGleich = zeilen[kandidat.zeilenIndex]?.toLowerCase() ?? '';
  const anker = GEBURTS_ANKER.some((a) => zeileDavor.includes(a) || zeileGleich.includes(a));
  const confidence: ConfidenceLevel = plausibel.length === 1 && anker ? 'high' : 'medium';
  return { feld: { wert: kandidat.datum, confidence }, treffer: kandidat };
}

function abstandTage(t: DatumTreffer, heute: Date): number {
  return (heute.getTime() - t.zeit) / TAG_IN_MS;
}

function waehleAusstellungsdatum(zeilen: string[], geburtsdatum: string, heute: Date): FeldResultat {
  const amAnker = datumNachAnker(zeilen, ANKER.datum, 'ausstellung', heute);
  if (amAnker && amAnker.datum !== geburtsdatum) return { wert: amAnker.datum, confidence: 'high' };

  const kandidaten = sammleDatumsTreffer(zeilen, 'ausstellung', heute)
    .filter((t) => t.datum !== geburtsdatum)
    .map((t) => ({ t, diffTage: Math.abs(abstandTage(t, heute)) }))
    .filter((k) => k.diffTage <= AUSSTELLUNG_TOLERANZ_TAGE)
    .sort((a, b) => a.diffTage - b.diffTage);

  if (kandidaten.length === 0) return leer();
  const confidence: ConfidenceLevel = kandidaten.length === 1 ? 'high' : 'medium';
  return { wert: kandidaten[0].t.datum, confidence };
}

// Muster 16 druckt Nachname und Vorname in zwei Zeilen untereinander, danach
// Straße und PLZ/Ort. Ergebnis im App-Format „Vorname Nachname“.
function waehlePatientNameAmAnker(zeilen: string[]): FeldResultat | null {
  const index = findeAnker(zeilen, ANKER.name);
  if (index === -1) return null;

  // Die iOS-Texterkennung sortiert „geb. am / 24.05.61“ (rechte Spalte) oft
  // zwischen Nachname und Vorname ein — Beschriftungen und Datumszeilen werden
  // übersprungen, erst eine andere Zeile mit Ziffern (Adresse) beendet die Suche.
  const teile: string[] = [];
  for (let i = index + 1; i <= Math.min(index + ANKER_FENSTER + 2, zeilen.length - 1) && teile.length < 2; i++) {
    const zeile = zeilen[i];
    if (istBeschriftung(zeile) || DATUMSZEILE.test(zeile)) continue;
    if (/\d/.test(zeile)) break; // Adresszeile erreicht
    if (!NAMENSZEILE.test(zeile)) continue;
    teile.push(zeile);
  }
  if (teile.length === 0) return null;

  if (teile[0].includes(',')) {
    const [nachname, vorname] = teile[0].split(',').map((s) => s.trim());
    return { wert: [vorname, nachname].filter(Boolean).join(' '), confidence: 'medium' };
  }
  if (teile.length === 2) return { wert: `${teile[1]} ${teile[0]}`, confidence: 'high' };
  return { wert: teile[0], confidence: 'medium' };
}

function waehlePatientName(zeilen: string[], geburtsdatumTreffer: DatumTreffer | null): FeldResultat {
  const amAnker = waehlePatientNameAmAnker(zeilen);
  if (amAnker) return amAnker;

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

// Straße mit Hausnummer („Beispielweg 7“, „Hauptstr. 12a“).
const STRASSENZEILE = /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß.' -]*\s\d+\s?[a-zA-Z]?$/;
// PLZ und Ort, optional mit Länderkennung „D“; Vision liest sie mal in einer,
// mal in drei Zeilen („D“, „12345“, „Musterstadt“).
const PLZ_ORT = /(?:^|\s)(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß. -]*[a-zäöüß.])/;

// Die Adresszeilen stehen zwischen „Name, Vorname des Versicherten“ und
// „Kostenträgerkennung“ — nur dort wird gesucht, nie im übrigen Formular.
function waehleAdresse(zeilen: string[]): { strasse: FeldResultat; plz: FeldResultat; ort: FeldResultat } {
  const leerAdresse = { strasse: leer(), plz: leer(), ort: leer() };
  const start = findeAnker(zeilen, ANKER.name);
  if (start === -1) return leerAdresse;
  const ende = findeAnker(zeilen, ANKER.kostentraeger, start);
  const block = zeilen
    .slice(start + 1, ende === -1 ? start + 1 + ANKER_FENSTER + 6 : ende)
    .filter((z) => !istBeschriftung(z) && !DATUMSZEILE.test(z));

  const strassenIndex = block.findIndex((z) => STRASSENZEILE.test(z));
  if (strassenIndex === -1) return leerAdresse;
  const strasse: FeldResultat = { wert: block[strassenIndex], confidence: 'medium' };
  const rest = block.slice(strassenIndex + 1).join(' ');
  const plzOrt = PLZ_ORT.exec(rest);
  if (!plzOrt) return { ...leerAdresse, strasse };
  return {
    strasse,
    plz: { wert: plzOrt[1], confidence: 'high' },
    ort: { wert: plzOrt[2].trim(), confidence: 'medium' },
  };
}

function neunstelligeAb(zeilen: string[], von: number, bis: number): { wert: string; zeilenIndex: number }[] {
  const kandidaten: { wert: string; zeilenIndex: number }[] = [];
  for (let i = von; i <= Math.min(bis, zeilen.length - 1); i++) {
    for (const [folge] of zeilen[i].matchAll(ZIFFERNFOLGE_GLOBAL)) {
      // Die iOS-Texterkennung liest „990000200 123456699“ teils ohne Leerraum.
      if (folge.length === 9 || folge.length === 18) {
        for (let start = 0; start < folge.length; start += 9) {
          kandidaten.push({ wert: folge.slice(start, start + 9), zeilenIndex: i });
        }
      }
    }
  }
  return kandidaten;
}

// „Betriebsstätten-Nr. | Arzt-Nr.“ stehen nebeneinander, darunter die beiden
// Nummern in derselben Reihenfolge. Die BSNR hat keine Prüfziffer, die LANR
// schon — die Prüfziffer trennt die beiden zuverlässig.
function waehleLanrAmAnker(zeilen: string[]): LanrTreffer | null {
  const index = findeAnker(zeilen, ANKER.arztNr);
  if (index === -1) return null;
  const kandidaten = neunstelligeAb(zeilen, index, index + ANKER_FENSTER);
  if (kandidaten.length === 0) return null;

  const gueltig = kandidaten.filter((k) => pruefeLanr(k.wert));
  if (gueltig.length === 1) return { feld: { wert: gueltig[0].wert, confidence: 'high' }, zeilenIndex: gueltig[0].zeilenIndex };
  // Mehrdeutig oder keine gültige: die LANR steht rechts der BSNR, also an
  // zweiter Stelle — der Validator stuft eine ungültige Nummer ohnehin herab.
  const kandidat = gueltig.length > 1 ? gueltig[gueltig.length - 1] : (kandidaten[1] ?? kandidaten[0]);
  return { feld: { wert: kandidat.wert, confidence: 'medium' }, zeilenIndex: kandidat.zeilenIndex };
}

function waehleLanr(zeilen: string[]): LanrTreffer {
  const amAnker = waehleLanrAmAnker(zeilen);
  if (amAnker) return amAnker;

  const kandidaten = neunstelligeAb(zeilen, 0, zeilen.length - 1);
  if (kandidaten.length === 0) return { feld: leer(), zeilenIndex: null };

  const mitLabel = kandidaten.find((k) => {
    const zeile = zeilen[k.zeilenIndex].toLowerCase();
    return LANR_LABEL.some((l) => zeile.includes(l)) && !BSNR_LABEL.some((l) => zeile.includes(l));
  });
  const kandidat = mitLabel ?? kandidaten[0];
  const confidence: ConfidenceLevel = mitLabel ? 'high' : kandidaten.length === 1 ? 'medium' : 'low';
  return { feld: { wert: kandidat.wert, confidence }, zeilenIndex: kandidat.zeilenIndex };
}

function bereinigeArztName(zeile: string): string {
  return zeile.replace(/\s+und(\s+angestellte\w*)?\s*$/i, '').trim();
}

function waehleArztName(zeilen: string[], lanrTreffer: LanrTreffer): FeldResultat {
  // Im Vertragsarztstempel: erst ein Name mit Titel, sonst die Praxiszeile.
  const stempel = findeAnker(zeilen, ANKER.stempel);
  if (stempel !== -1) {
    const block = zeilen.slice(stempel + 1, stempel + 1 + 8);
    const mitTitel = block.find((z) => ARZT_ANKER_TITEL.test(z));
    if (mitTitel) return { wert: bereinigeArztName(mitTitel), confidence: 'medium' };
  }

  const titelZeile = zeilen.find((z) => ARZT_ANKER_TITEL.test(z));
  if (titelZeile) return { wert: bereinigeArztName(titelZeile), confidence: 'medium' };
  const praxisZeile = zeilen.find((z) => ARZT_ANKER_PRAXIS.some((a) => z.toLowerCase().includes(a)));
  if (praxisZeile) return { wert: praxisZeile.trim(), confidence: 'medium' };

  if (lanrTreffer.zeilenIndex !== null) {
    for (let i = lanrTreffer.zeilenIndex - 1; i >= 0; i--) {
      const zeile = zeilen[i]?.trim();
      if (zeile) return { wert: zeile, confidence: 'medium' };
    }
  }
  return leer();
}

// Das Verordnungsfeld unter „Rp.“: erst das Hilfsmittel, dann (meist mit
// „Diagnose:“ eingeleitet) die Diagnosen, bis zur Sternchen-Entwertung oder
// dem Arbeitsunfall-Block.
function verordnungsblock(zeilen: string[]): string[] | null {
  const index = findeAnker(zeilen, ANKER.rp);
  if (index === -1) return null;
  const block: string[] = [];
  for (let i = index + 1; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    if (RP_ENDE.test(zeile)) break;
    if (AUT_IDEM_RAUSCHEN.test(zeile) || zeile.length < 3) continue;
    block.push(zeile);
  }
  return block.length > 0 ? block : null;
}

function hatHilfsmittelKeyword(text: string): boolean {
  const klein = text.toLowerCase();
  return HILFSMITTEL_KEYWORDS.some((k) => klein.includes(k));
}

// Aufdrucke der Abgabestelle (Taxe, Rezeptnummer, Apotheken-IK) und
// Formularbeschriftungen, die Vision je nach Bildlage mitten ins
// Verordnungsfeld einsortiert.
function istFremdzeile(zeile: string): boolean {
  const ohneText = !/[A-Za-zÄÖÜäöüß]{2}/.test(zeile) && !ICD10_REGEX.test(zeile);
  return istBeschriftung(zeile) || BETRAGSZEILE.test(zeile) || /^rezept\s*:/i.test(zeile) || ohneText;
}

// Verordnungstext ist Fließtext: mindestens zwei Wörter pro Zeile.
function istVerordnungsprosa(zeile: string): boolean {
  return !istFremdzeile(zeile) && (zeile.match(/[A-Za-zÄÖÜäöüß]{2,}/g)?.length ?? 0) >= 2;
}

function teileVerordnung(block: string[]): { hilfsmittel: FeldResultat; diagnose: FeldResultat } {
  let diagnoseStart = block.findIndex((z) => DIAGNOSE_ANKER.some((a) => z.toLowerCase().includes(a)));
  if (diagnoseStart === -1) diagnoseStart = block.findIndex((z) => ICD10_REGEX.test(z));

  const hilfsmittelZeilen = diagnoseStart === -1 ? block : block.slice(0, diagnoseStart);
  const prosaEnde = hilfsmittelZeilen.findIndex((z) => !istVerordnungsprosa(z));
  const hilfsmittelText = (prosaEnde === -1 ? hilfsmittelZeilen : hilfsmittelZeilen.slice(0, prosaEnde)).join(' ').trim();
  // Diagnosen dürfen einwortige Fortsetzungszeilen haben („Lokalisationen“).
  const diagnoseText =
    diagnoseStart === -1
      ? ''
      : block
          .slice(diagnoseStart)
          .filter((z) => !istFremdzeile(z))
          .join(' ')
          .replace(/^diagnosen?\s*:?\s*/i, '')
          .trim();

  return {
    hilfsmittel: hilfsmittelText
      ? { wert: hilfsmittelText, confidence: hatHilfsmittelKeyword(hilfsmittelText) ? 'high' : 'medium' }
      : leer(),
    diagnose: diagnoseText ? { wert: diagnoseText, confidence: ICD10_REGEX.test(diagnoseText) ? 'high' : 'medium' } : leer(),
  };
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
  return (
    DATUM_EINZELN.test(zeile) || NEUNSTELLIG_EINZELN.test(zeile) || HILFSMITTELNUMMER_EINZELN.test(zeile) || ICD10_REGEX.test(zeile)
  );
}

function waehleHilfsmittel(zeilen: string[]): FeldResultat {
  const keywordZeile = zeilen.find((z) => hatHilfsmittelKeyword(z));
  if (keywordZeile) return { wert: keywordZeile.trim(), confidence: 'medium' };

  const unstrukturiert = zeilen.filter((z) => z.length > 8 && !istStrukturiert(z));
  if (unstrukturiert.length === 0) return leer();
  const laengste = unstrukturiert.reduce((a, b) => (b.length > a.length ? b : a));
  return { wert: laengste.trim(), confidence: 'medium' };
}

// Eine dreiteilige Nummer, die zugleich ein gültiges Datum ist („24.05.61“),
// ist mit hoher Wahrscheinlichkeit das Geburts-/Ausstellungsdatum.
function istDatum(nummer: string): boolean {
  const teile = nummer.split('.');
  if (teile.length !== 3) return false;
  const [tag, monat] = teile.map(Number);
  return tag >= 1 && tag <= 31 && monat >= 1 && monat <= 12;
}

function waehleHilfsmittelNr(zeilen: string[]): FeldResultat {
  for (const zeile of zeilen) {
    for (const treffer of zeile.matchAll(HILFSMITTELNUMMER_GLOBAL)) {
      if (!istDatum(treffer[0])) return { wert: treffer[0], confidence: 'high' };
    }
  }
  return leer();
}

function waehleKasse(zeilen: string[]): { krankenkasseName: FeldResultat; ik: FeldResultat; versichertenNr: FeldResultat } {
  const kasseIndex = findeAnker(zeilen, ANKER.kasse);
  const ab = Math.max(kasseIndex, 0);

  let krankenkasseName = leer();
  if (kasseIndex !== -1) {
    for (let i = kasseIndex + 1; i <= Math.min(kasseIndex + ANKER_FENSTER, zeilen.length - 1); i++) {
      if (istBeschriftung(zeilen[i]) || !/[A-Za-zÄÖÜäöü]{2}/.test(zeilen[i])) continue;
      const name = zeilen[i].replace(/\s+\d+$/, '').trim();
      const bekannt = KRANKENKASSEN_NAMEN.some((k) => name.toLowerCase().includes(k));
      krankenkasseName = { wert: name, confidence: bekannt ? 'high' : 'medium' };
      break;
    }
  }

  // Versicherten-Nr. (Buchstabe + 9 Ziffern), oft ohne Leerraum direkt hinter
  // der neunstelligen Kostenträgerkennung gelesen („101234569Q123456784“).
  let versichertenNr = leer();
  let ik = leer();
  for (let i = ab; i < zeilen.length && !versichertenNr.wert; i++) {
    for (const match of zeilen[i].matchAll(VERSICHERTENNR_GLOBAL)) {
      versichertenNr = { wert: match[1], confidence: 'high' };
      const davor = /(\d{9})\s*$/.exec(zeilen[i].slice(0, (match.index ?? 0) + match[0].indexOf(match[1])));
      if (davor) ik = { wert: davor[1], confidence: 'high' };
      break;
    }
  }

  if (!ik.wert) {
    const ktIndex = findeAnker(zeilen, ANKER.kostentraeger);
    if (ktIndex !== -1) {
      const kandidat = neunstelligeAb(zeilen, ktIndex, ktIndex + ANKER_FENSTER).find((k) => pruefeIk(k.wert));
      if (kandidat) ik = { wert: kandidat.wert, confidence: 'high' };
    }
  }

  return { krankenkasseName, ik, versichertenNr };
}

export function parseRezept(zeilen: string[], heute: Date = new Date()): RezeptFelder {
  const bereinigteZeilen = zeilen.map((z) => z.trim()).filter((z) => z.length > 0);

  const { feld: patientGeburtsdatum, treffer: geburtsdatumTreffer } = waehleGeburtsdatum(bereinigteZeilen, heute);
  const datum = waehleAusstellungsdatum(bereinigteZeilen, patientGeburtsdatum.wert, heute);
  const patientName = waehlePatientName(bereinigteZeilen, geburtsdatumTreffer);
  const lanrTreffer = waehleLanr(bereinigteZeilen);
  const arztName = waehleArztName(bereinigteZeilen, lanrTreffer);
  const verordnung = verordnungsblock(bereinigteZeilen);
  const { hilfsmittel, diagnose } = verordnung
    ? teileVerordnung(verordnung)
    : { hilfsmittel: waehleHilfsmittel(bereinigteZeilen), diagnose: waehleDiagnose(bereinigteZeilen) };
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
    ...waehleKasse(bereinigteZeilen),
    ...waehleAdresse(bereinigteZeilen),
  };
}

// Fachliche Hinweise, die der Nutzer vor dem Weitermachen sehen soll. Ein
// eingelöstes Rezept trägt den Apotheken-/Abrechnungsaufdruck (Taxe-Beträge,
// „bezahlt“, Rezeptnummer der Abgabestelle).
export function erkenneHinweise(zeilen: string[], felder: RezeptFelder, heute: Date = new Date()): RezeptHinweis[] {
  const hinweise: RezeptHinweis[] = [];
  const bereinigt = zeilen.map((z) => z.trim());
  if (bereinigt.some((z) => BETRAGSZEILE.test(z) || /\bbezahlt\b/i.test(z) || /^rezept\s*:\s*\d{5,}/i.test(z))) {
    hinweise.push('BEREITS_EINGELOEST');
  }

  const ausstellung = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(felder.datum.wert);
  if (ausstellung) {
    const zeit = new Date(Number(ausstellung[3]), Number(ausstellung[2]) - 1, Number(ausstellung[1])).getTime();
    if ((heute.getTime() - zeit) / TAG_IN_MS > GUELTIGKEIT_TAGE) hinweise.push('AELTER_ALS_28_TAGE');
  }
  return hinweise;
}
