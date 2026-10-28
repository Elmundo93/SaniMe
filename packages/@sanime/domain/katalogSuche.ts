import { BEDARF_KATALOG, type Bedarf } from './bedarf';
import { KRANKHEITSBILD_KATALOG } from './krankheitsbild';
import type { Produkt } from './types';

// Discovery Engine, Ebene 1: deterministische, pure Funktionen — von der App
// (on-device Vorschläge, Sprach-Abgleich) und vom Backend (Query-Expansion für
// GET /products?q=…) identisch genutzt, damit beide Seiten denselben Begriff
// gleich verstehen. Bewusst kein Cloud-NLP/LLM: eine spätere semantische
// Ebene ersetzt findeBedarfe()/findeHilfe() hinter derselben Signatur.
// Alle Begriffe hier sind Platzhalter-Vokabular (CLAUDE.md-Katalogregel).

// Wörter, die in gesprochenen/getippten Sätzen vorkommen, aber nichts über das
// Gesuchte sagen („Ich suche etwas, das mir beim Aufstehen hilft“).
const FUELLWOERTER = new Set([
  'ich', 'du', 'mir', 'mich', 'mein', 'meine', 'meinen', 'meiner', 'wir', 'uns',
  'suche', 'suchen', 'brauche', 'brauchen', 'benoetige', 'moechte', 'haette', 'gerne', 'gern', 'bitte',
  'ein', 'eine', 'einen', 'einem', 'einer', 'der', 'die', 'das', 'den', 'dem', 'des',
  'und', 'oder', 'mit', 'fuer', 'von', 'zum', 'zur', 'beim', 'bei', 'im', 'in', 'am', 'an', 'auf', 'aus',
  'etwas', 'was', 'das', 'dass', 'hilft', 'helfen', 'hilfe', 'kann', 'koennen', 'habe', 'hat', 'ist', 'sind',
  'nicht', 'mehr', 'so', 'sehr', 'auch', 'noch', 'schon', 'wie', 'wo', 'wenn', 'es', 'sie', 'er',
]);

/** Kleinbuchstaben, Umlaute ausgeschrieben (ä→ae …), Satzzeichen raus, Leerraum
 * zusammengefasst. Muss zu `normSql()` im Backend passen (products.repository.ts). */
export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalisierte Wörter ohne Füllwörter. */
export function suchwoerter(text: string): string[] {
  return normalisiere(text)
    .split(' ')
    .filter((w) => w.length > 1 && !FUELLWOERTER.has(w));
}

/** Kanonischer Begriff → gebräuchliche Varianten (alles bereits normalisiert). */
export const SYNONYME: Record<string, string[]> = {
  rollator: ['gehwagen', 'laufhilfe', 'laufwagen', 'rolator', 'rollatoren'],
  rollstuhl: ['rolli', 'faltrollstuhl', 'schieberollstuhl', 'rollstuehle'],
  gehstock: ['stock', 'spazierstock', 'gehstoecke', 'krueckstock'],
  gehstuetze: ['kruecke', 'kruecken', 'unterarmgehstuetze', 'unterarmstuetze'],
  duschstuhl: ['duschsitz', 'duschhocker', 'duschhilfe', 'duschklappsitz'],
  badewannenlift: ['wannenlift', 'badelift', 'badewannensitz', 'wannenbrett'],
  toilettensitzerhoehung: ['toilettenaufsatz', 'wc aufsatz', 'klositz', 'toilettensitz', 'sitzerhoehung'],
  toilettenstuhl: ['nachtstuhl', 'zimmertoilette'],
  greifzange: ['greifhilfe', 'greifer', 'aufheber', 'greifarm'],
  strumpfanzieher: ['anziehhilfe', 'sockenanzieher', 'strumpfanziehhilfe'],
  aufstehhilfe: ['aufrichthilfe', 'bettgalgen', 'aufstehsessel', 'haltegriff'],
  pflegebett: ['krankenbett', 'elektrobett', 'seniorenbett'],
  matratze: ['antidekubitusmatratze', 'wechseldruckmatratze', 'pflegematratze'],
  lagerungskissen: ['lagerungshilfe', 'seitenlagerungskissen', 'kissen'],
  blutdruckmessgeraet: ['blutdruck', 'blutdruckmesser', 'blutdruckgeraet'],
  lupe: ['vergroesserungsglas', 'leselupe', 'lesehilfe', 'vergroesserung'],
  inkontinenzeinlage: ['einlage', 'vorlage', 'windel', 'windeln', 'inkontinenz'],
  kompressionsstrumpf: ['stuetzstrumpf', 'kompressionsstruempfe', 'thrombosestrumpf', 'stuetzstruempfe'],
  bandage: ['kniebandage', 'stuetzbandage', 'orthese'],
  inhalationsgeraet: ['inhalator', 'inhaliergeraet', 'vernebler'],
  rampe: ['auffahrrampe', 'schwellenrampe', 'rollstuhlrampe'],
  bewegungstrainer: ['pedaltrainer', 'heimtrainer', 'beintrainer', 'armtrainer'],
};

// Varianten-Lookup einmal aufbauen: Variante oder kanonischer Begriff → kanonisch.
const KANONISCH = new Map<string, string>();
for (const [kanonisch, varianten] of Object.entries(SYNONYME)) {
  KANONISCH.set(kanonisch, kanonisch);
  for (const variante of varianten) KANONISCH.set(variante, kanonisch);
}

/** Normalisiert, entfernt Füllwörter und erweitert um Synonyme. Ergebnis: die
 * eigenen Wörter plus die kanonischen Begriffe und deren Varianten — das Backend
 * sucht mit jedem davon (ILIKE ANY), die Reihenfolge ist ohne Bedeutung. */
export function erweitereSuchbegriffe(text: string): string[] {
  const normal = normalisiere(text);
  const woerter = suchwoerter(text);
  const begriffe = new Set<string>(woerter);
  const treffe = (kanonisch: string) => {
    begriffe.add(kanonisch);
    for (const v of SYNONYME[kanonisch]) begriffe.add(v);
  };
  for (const wort of woerter) {
    const kanonisch = KANONISCH.get(wort);
    if (kanonisch) treffe(kanonisch);
  }
  // Mehrwortvarianten („wc aufsatz“) stehen nicht als einzelnes Wort im Text.
  for (const [variante, kanonisch] of KANONISCH) {
    if (variante.includes(' ') && normal.includes(variante)) treffe(kanonisch);
  }
  return [...begriffe];
}

// ─── Bedarfe & Krankheitsbilder (Discovery) ──────────────────────────────────

function trefferAnzahl(normalText: string, stichworte: string[]): number {
  return stichworte.filter((s) => normalText.includes(normalisiere(s))).length;
}

/** Bedarfe, deren Stichworte im Text vorkommen — nach Trefferzahl gerankt. */
export function findeBedarfe(text: string): Bedarf[] {
  const normal = normalisiere(text);
  if (!normal) return [];
  return BEDARF_KATALOG.map((bedarf) => ({ bedarf, anzahl: trefferAnzahl(normal, bedarf.stichworte) }))
    .filter((t) => t.anzahl > 0)
    .sort((a, b) => b.anzahl - a.anzahl)
    .map((t) => t.bedarf);
}

export interface HilfeTreffer {
  typ: 'bedarf' | 'krankheitsbild';
  id: string;
  titel: string;
  icon: string;
}

/** Ein gemeinsamer Discovery-Weg für Alltagsbedarfe und Krankheitsbilder (Text und
 * Sprache). Bedarfe zuerst — sie beschreiben Situationen, keine Diagnosen. Liefert
 * Kandidaten zur Rückfrage („Meintest du …?“), nie eine automatische Entscheidung. */
export function findeHilfe(text: string): HilfeTreffer[] {
  const normal = normalisiere(text);
  if (!normal) return [];
  const bedarfe = findeBedarfe(text).map<HilfeTreffer>((b) => ({ typ: 'bedarf', id: b.id, titel: b.titel, icon: b.icon }));
  const krankheitsbilder = KRANKHEITSBILD_KATALOG.map((kb) => ({ kb, anzahl: trefferAnzahl(normal, kb.synonyme) }))
    .filter((t) => t.anzahl > 0)
    .sort((a, b) => b.anzahl - a.anzahl)
    .map<HilfeTreffer>(({ kb }) => ({ typ: 'krankheitsbild', id: kb.id, titel: kb.bezeichnung, icon: kb.icon }));
  return [...bedarfe, ...krankheitsbilder];
}

// ─── Verordnung → passende Versorgungen ─────────────────────────────────────

// Floskeln des Verordnungstexts, die nichts über das Hilfsmittel sagen.
const VERORDNUNGS_FLOSKELN = new Set([
  'nach', 'genehmigung', 'gkv', 'kasse', 'krankenkasse', 'verordnung', 'versorgung', 'hilfsmittel',
  'stueck', 'stk', 'paar', 'neu', 'neuversorgung', 'folgeversorgung', 'ersatz',
]);
// Deutsche Komposita: „Gehstock“ soll „Unterarmgehstützen“ finden. Ab dieser
// Länge zählt auch der Wortanfang eines eigenen Begriffs (nicht der Synonyme).
const STAMM_LAENGE = 5;
// Ein einzelner Synonym-Treffer im Beschreibungstext (1 Punkt, z.B. „Stockhalter“
// beim Rollator für „Gehstock“) reicht nicht für „passend“.
const MIN_PUNKTE = 2;

interface Treffer {
  produkt: Produkt;
  punkte: number;
  index: number;
}

function bewerte(produkt: Produkt, eigene: string[], synonyme: string[]): number {
  const name = normalisiere(produkt.name);
  const kategorie = normalisiere(produkt.kategorie);
  const text = normalisiere([produkt.kurzbeschreibung ?? '', produkt.beschreibung, ...produkt.merkmale].join(' '));
  let punkte = 0;
  for (const begriff of [...eigene, ...synonyme]) {
    const stamm = eigene.includes(begriff) && begriff.length > STAMM_LAENGE + 1 ? begriff.slice(0, STAMM_LAENGE) : null;
    if (name.includes(begriff)) punkte += 4;
    else if (stamm && name.includes(stamm)) punkte += 2;
    else if (kategorie.includes(begriff)) punkte += 3;
    else if (stamm && kategorie.includes(stamm)) punkte += 1;
    else if (text.includes(begriff)) punkte += 1;
  }
  return punkte;
}

/** Teilt die Versorgungen in die zum Verordnungstext passenden (nach Relevanz,
 * bei Gleichstand in Katalogreihenfolge) und die übrigen. Nur eine Sortierhilfe
 * für die Auswahl — nie eine automatische Entscheidung, der Nutzer wählt selbst. */
export function rankeNachVerordnung(produkte: Produkt[], verordnung: string): { passend: Produkt[]; weitere: Produkt[] } {
  const eigene = suchwoerter(verordnung).filter((w) => !VERORDNUNGS_FLOSKELN.has(w) && !/^\d+x?$/.test(w));
  const synonyme = erweitereSuchbegriffe(eigene.join(' ')).filter((b) => !eigene.includes(b));
  if (eigene.length === 0) return { passend: [], weitere: produkte };

  const bewertet: Treffer[] = produkte.map((produkt, index) => ({ produkt, punkte: bewerte(produkt, eigene, synonyme), index }));
  const passend = bewertet
    .filter((t) => t.punkte >= MIN_PUNKTE)
    .sort((a, b) => b.punkte - a.punkte || a.index - b.index)
    .map((t) => t.produkt);
  return { passend, weitere: produkte.filter((p) => !passend.includes(p)) };
}

// ─── Vorschläge & Tippfehler ────────────────────────────────────────────────

export interface Vorschlag {
  typ: 'begriff' | 'kategorie' | 'bedarf';
  label: string;
  /** Kategorie-/Bedarfs-ID; bei `begriff` der Suchtext selbst. */
  wert: string;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const zeile = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let vorher = zeile[0];
    zeile[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const merk = zeile[j];
      zeile[j] = Math.min(zeile[j] + 1, zeile[j - 1] + 1, vorher + (a[i - 1] === b[j - 1] ? 0 : 1));
      vorher = merk;
    }
  }
  return zeile[b.length];
}

/** Erlaubte Tippfehler je Wortlänge: kurze Wörter exakt, lange großzügiger. */
function toleranz(wort: string): number {
  if (wort.length <= 4) return 0;
  if (wort.length <= 7) return 1;
  return 2;
}

/** „Meintest du …?“ — korrigiert unbekannte Wörter auf das nächstliegende bekannte
 * Vokabular (Synonyme). `null`, wenn nichts zu korrigieren ist. */
export function schreibvorschlag(text: string): string | null {
  const woerter = suchwoerter(text);
  let geaendert = false;
  const korrigiert = woerter.map((wort) => {
    if (KANONISCH.has(wort)) return wort;
    let bestes: { begriff: string; abstand: number } | null = null;
    for (const begriff of KANONISCH.keys()) {
      if (begriff.includes(' ')) continue;
      const abstand = levenshtein(wort, begriff);
      if (abstand <= toleranz(wort) && (!bestes || abstand < bestes.abstand)) bestes = { begriff, abstand };
    }
    if (!bestes) return wort;
    geaendert = true;
    return KANONISCH.get(bestes.begriff) ?? bestes.begriff;
  });
  return geaendert ? korrigiert.join(' ') : null;
}

/** Autocomplete beim Tippen — rein on-device aus statischen Domain-Daten und den
 * bereits geladenen Kategorienamen, damit nicht jeder Tastendruck eine Anfrage
 * (mit potenziell sensiblen Teilbegriffen) auslöst. */
export function schlageVor(text: string, kategorien: { id: string; name: string }[], max = 5): Vorschlag[] {
  const normal = normalisiere(text);
  if (normal.length < 2) return [];
  const passt = (label: string) =>
    normalisiere(label)
      .split(' ')
      .some((w) => w.startsWith(normal)) || normalisiere(label).startsWith(normal);

  const vorschlaege: Vorschlag[] = [];
  for (const k of kategorien) {
    if (passt(k.name)) vorschlaege.push({ typ: 'kategorie', label: k.name, wert: k.id });
  }
  for (const b of BEDARF_KATALOG) {
    if (passt(b.titel) || b.stichworte.some((s) => normalisiere(s).startsWith(normal))) {
      vorschlaege.push({ typ: 'bedarf', label: b.titel, wert: b.id });
    }
  }
  for (const begriff of Object.keys(SYNONYME)) {
    if (begriff.startsWith(normal) || SYNONYME[begriff].some((v) => v.startsWith(normal))) {
      const label = begriff.charAt(0).toUpperCase() + begriff.slice(1);
      vorschlaege.push({ typ: 'begriff', label, wert: begriff });
    }
  }
  return vorschlaege.slice(0, max);
}
