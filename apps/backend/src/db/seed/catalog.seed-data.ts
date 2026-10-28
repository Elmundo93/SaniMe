// Reine Seed-Daten (kein DB-Zugriff) — von catalog.seed.ts geschrieben und vom
// Invarianten-Test catalog.seed-data.spec.ts gegen @sanime/domain geprüft.
//
// Katalog v1 (2026-10-28): herstellerneutrale Selbstzahler-Artikel ohne
// Hilfsmittelnummer — das, was wir ohne Kassenvertrag verkaufen können. Bewusst
// keine Marken, Hersteller-Artikelnummern oder HiMi-Nummern: die kommen erst mit
// dem Lieferanten (Artikel → Lieferantenartikel zuordnen). Merkmale beschreiben,
// was der beschaffte Artikel mindestens erfüllen muss. Preise sind Endpreise
// inkl. MwSt. und RICHTPREISE nach üblichem Marktniveau — vom Einkauf zu
// bestätigen (`npm run backend:katalog-pruefliste` exportiert die Liste).
// Größen/Ausführungen sind Varianten (VARIANTEN unten), die beim Bestellen
// gewählt werden müssen. Medizinische Kompressionsstrümpfe und Bandagen nach Maß
// fehlen: sie brauchen ein Maß bzw. ein Rezept. Texte beschreiben Funktion, keine Heilversprechen (HWG).
//
// Die Kassenartikel-Platzhalter für Entwicklung und Tests stehen in
// catalog.entwicklung.seed-data.ts und werden in Produktion nicht geseedet.

export const SUPPLIER_ID = '30000000-0000-0000-0000-000000000001';

export const MANUFACTURER_IDS = {
  neutral: '20000000-0000-0000-0000-000000000010',
} as const;

export const MANUFACTURERS = [{ id: MANUFACTURER_IDS.neutral, name: 'Markenneutral (je nach Lieferant)' }];

// Vor dem Katalogausbau geseedete Kategorien — gleiche UUIDs behalten.
const ALT_ROLLSTUHL_ID = '10000000-0000-0000-0000-000000000001';
export const ALT_SELBSTZAHLER_KATEGORIE_ID = '10000000-0000-0000-0000-000000000002';

export interface SeedKategorie {
  id: string;
  slug: string;
  name: string;
  parentSlug: string | null;
  icon: string;
  beschreibung?: string;
  krankheitsbildId?: string;
  isActive?: boolean;
}

const haupt = (n: number) => `11000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const unter = (n: number) => `12000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

export const KATEGORIEN: SeedKategorie[] = [
  // ── Hauptkategorien (reine Navigation) ──
  { id: haupt(1), slug: 'mobil-bleiben', name: 'Mobil bleiben', parentSlug: null, icon: 'navigation', beschreibung: 'Rollatoren, Rollstühle, Gehhilfen und Rampen', krankheitsbildId: 'mobilitaet' },
  { id: haupt(2), slug: 'zuhause', name: 'Zuhause leichter leben', parentSlug: null, icon: 'home', beschreibung: 'Kleine Helfer für Alltag, Küche und Lesen' },
  { id: haupt(3), slug: 'bad-toilette', name: 'Bad & Toilette', parentSlug: null, icon: 'droplet', beschreibung: 'Sicher duschen, baden und zur Toilette gehen' },
  { id: haupt(4), slug: 'pflege-schlafen', name: 'Pflege & Schlafen', parentSlug: null, icon: 'moon', beschreibung: 'Pflegebetten, Matratzen und Lagerung', krankheitsbildId: 'pflegebett' },
  { id: haupt(5), slug: 'gesundheit', name: 'Gesundheit & Wohlbefinden', parentSlug: null, icon: 'heart', beschreibung: 'Bandagen, Kompression, Messgeräte und mehr' },
  { id: haupt(6), slug: 'hygiene-inkontinenz', name: 'Hygiene & Inkontinenz', parentSlug: null, icon: 'shield', beschreibung: 'Inkontinenzartikel, Haut- und Körperpflege', krankheitsbildId: 'inkontinenz' },
  { id: haupt(7), slug: 'bewegung-training', name: 'Bewegung & Training', parentSlug: null, icon: 'activity', beschreibung: 'Bewegungstrainer und Therapiegeräte' },

  // ── Unterkategorien (Produkte hängen immer hier) ──
  { id: unter(1), slug: 'rollatoren', name: 'Rollatoren', parentSlug: 'mobil-bleiben', icon: 'navigation' },
  { id: ALT_ROLLSTUHL_ID, slug: 'rollstuehle', name: 'Rollstühle', parentSlug: 'mobil-bleiben', icon: 'disc' },
  { id: unter(2), slug: 'gehhilfen', name: 'Gehhilfen', parentSlug: 'mobil-bleiben', icon: 'git-commit' },
  { id: unter(3), slug: 'rampen', name: 'Rampen', parentSlug: 'mobil-bleiben', icon: 'trending-up' },
  { id: unter(4), slug: 'mobil-zubehoer', name: 'Zubehör & Service', parentSlug: 'mobil-bleiben', icon: 'tool' },

  { id: unter(5), slug: 'greifhilfen', name: 'Greifhilfen', parentSlug: 'zuhause', icon: 'thumbs-up' },
  { id: unter(6), slug: 'anziehhilfen', name: 'Anziehhilfen', parentSlug: 'zuhause', icon: 'user' },
  { id: unter(7), slug: 'esshilfen', name: 'Esshilfen', parentSlug: 'zuhause', icon: 'coffee' },
  { id: unter(8), slug: 'aufstehhilfen', name: 'Aufstehhilfen', parentSlug: 'zuhause', icon: 'arrow-up-circle' },
  { id: unter(9), slug: 'lese-sehhilfen', name: 'Lese- & Sehhilfen', parentSlug: 'zuhause', icon: 'eye', beschreibung: 'Lupen und Leselampen — keine Brillen', krankheitsbildId: 'sehhilfen' },

  { id: unter(10), slug: 'duschhilfen', name: 'Duschhilfen', parentSlug: 'bad-toilette', icon: 'droplet' },
  { id: unter(11), slug: 'badewannenhilfen', name: 'Badewannenhilfen', parentSlug: 'bad-toilette', icon: 'layers' },
  { id: unter(12), slug: 'toilettenhilfen', name: 'Toilettenhilfen', parentSlug: 'bad-toilette', icon: 'chevrons-up' },

  { id: unter(13), slug: 'pflegebetten', name: 'Pflegebetten', parentSlug: 'pflege-schlafen', icon: 'moon' },
  { id: unter(14), slug: 'matratzen', name: 'Matratzen', parentSlug: 'pflege-schlafen', icon: 'square' },
  { id: unter(15), slug: 'lagerung', name: 'Lagerung', parentSlug: 'pflege-schlafen', icon: 'cloud' },
  { id: unter(16), slug: 'transferhilfen', name: 'Transferhilfen', parentSlug: 'pflege-schlafen', icon: 'repeat' },

  { id: unter(17), slug: 'bandagen', name: 'Bandagen', parentSlug: 'gesundheit', icon: 'circle' },
  { id: unter(18), slug: 'kompression', name: 'Kompression', parentSlug: 'gesundheit', icon: 'circle', krankheitsbildId: 'kompression' },
  { id: unter(19), slug: 'messgeraete', name: 'Messgeräte', parentSlug: 'gesundheit', icon: 'bar-chart-2' },
  { id: unter(20), slug: 'atemtherapie', name: 'Atemtherapie', parentSlug: 'gesundheit', icon: 'wind', krankheitsbildId: 'atemhilfen' },
  { id: unter(21), slug: 'wundversorgung', name: 'Wundversorgung', parentSlug: 'gesundheit', icon: 'plus-square', krankheitsbildId: 'wundversorgung' },

  { id: unter(22), slug: 'inkontinenzartikel', name: 'Inkontinenzartikel', parentSlug: 'hygiene-inkontinenz', icon: 'shield' },
  { id: unter(23), slug: 'hautpflege', name: 'Hautpflege', parentSlug: 'hygiene-inkontinenz', icon: 'sun' },
  { id: unter(24), slug: 'hygiene', name: 'Hygiene', parentSlug: 'hygiene-inkontinenz', icon: 'feather' },

  { id: unter(25), slug: 'bewegungstrainer', name: 'Bewegungstrainer', parentSlug: 'bewegung-training', icon: 'refresh-cw' },
  { id: unter(26), slug: 'therapiegeraete', name: 'Therapiegeräte', parentSlug: 'bewegung-training', icon: 'zap' },
  { id: unter(27), slug: 'trainingszubehoer', name: 'Trainingszubehör', parentSlug: 'bewegung-training', icon: 'target' },

  // „Selbstzahler“ ist eine Produkteigenschaft (fehlende HiMi-Nr.), keine
  // fachliche Kategorie — die alte Platzhalter-Kategorie bleibt nur deaktiviert
  // bestehen (bestehende FK-Verweise), der Gehstock wandert nach „Gehhilfen“.
  { id: ALT_SELBSTZAHLER_KATEGORIE_ID, slug: 'alt-selbstzahler', name: 'Selbstzahler-Hilfsmittel (Platzhalter)', parentSlug: null, icon: 'archive', isActive: false },
];

export interface SeedAngebot {
  /** Nur Kassenartikel: Platzhalter-Preis, wenn ohne Rezept gekauft wird. */
  selbstzahlerPreisCents?: number;
  copayCents: number;
  lieferzeitTage: number;
  availability?: 'available' | 'unavailable';
}

export interface SeedProdukt {
  id: string;
  kategorieSlug: string;
  herstellerId: string;
  name: string;
  /** null = Selbstzahler-Artikel. */
  hilfsmittelnummer: string | null;
  kurzbeschreibung: string;
  beschreibung: string;
  artikelnummer: string;
  merkmale: string[];
  attribute?: Record<string, string | number | boolean>;
  requiresApproval: boolean;
  /** Umsatzsteuersatz in Prozent, Standard 19. 7 nur bei klarer Einstufung nach
   * Anlage 2 UStG (Nr. 51 Rollstühle, Pos. 8713; Nr. 52 Krücken) — vom
   * Steuerberater zu bestätigen, siehe Prüfliste. */
  mwstSatz?: 7 | 19;
  angebot: SeedAngebot;
}

// UUIDs der früheren Selbstzahler-Platzhalter werden für die passenden echten
// Artikel weiterverwendet (bestehende DBs werden per Upsert umgestellt, alte
// Bestellungen zeigen weiter auf eine existierende Zeile); neue Artikel ab 100.
const produkt = (n: number) => `40000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
export const PRODUKT_IDS = {
  rollatorWohnung: produkt(6),
  rollatorStandard: produkt(100),
  rollatorLeicht: produkt(101),
  rollatorGelaende: produkt(102),
  rollatorXl: produkt(103),
  rollatorCarbon: produkt(104),
  rollstuhlFalt: produkt(105),
  rollstuhlLeicht: produkt(106),
  rollstuhlTransport: produkt(107),
  rollstuhlXl: produkt(108),
  gehstock: produkt(3),
  gehstockFaltbar: produkt(109),
  unterarmgehstuetzen: produkt(110),
  rollatorTasche: produkt(30),
  stockhalter: produkt(31),
  einweisung: produkt(33),
  sitzkissen: produkt(34),
  wartung: produkt(35),
  rollatorTablett: produkt(116),
  rollatorLicht: produkt(117),
  eiskralle: produkt(118),
  gummipuffer: produkt(119),
  regencape: produkt(120),
  therapietisch: produkt(121),
  pflegebett: produkt(159),
  strickleiter: produkt(161),
  betttisch: produkt(162),
  matratzenschutz: produkt(166),
  pflegematratze: produkt(167),
  inhalationsgeraet: produkt(203),
  stuetzstruempfe: produkt(235),
  pants: produkt(236),
  verneblerset: produkt(204),
  toilettenstuhl: produkt(154),
  steckbecken: produkt(157),
  urinflasche: produkt(156),
};

interface Artikel {
  id: string;
  kategorieSlug: string;
  name: string;
  kurzbeschreibung: string;
  beschreibung: string;
  artikelnummer: string;
  merkmale: string[];
  attribute?: Record<string, string | number | boolean>;
  /** Richtpreis inkl. MwSt. in Cent — vom Einkauf zu bestätigen. */
  preisCents: number;
  mwstSatz?: 7 | 19;
  lieferzeitTage?: number;
}

/** Selbstzahler-Artikel: keine HiMi-Nr., keine Genehmigung, voller Preis an der Kasse. */
const artikel = ({ preisCents, lieferzeitTage = 3, ...a }: Artikel): SeedProdukt => ({
  ...a,
  herstellerId: MANUFACTURER_IDS.neutral,
  hilfsmittelnummer: null,
  requiresApproval: false,
  angebot: { copayCents: preisCents, lieferzeitTage },
});

const id = PRODUKT_IDS;

export const PRODUKTE: SeedProdukt[] = [
  // ══ Mobil bleiben ══

  // ── Rollatoren ──
  artikel({
    id: id.rollatorStandard, kategorieSlug: 'rollatoren', artikelnummer: 'SM-ROL-001', preisCents: 8900,
    name: 'Rollator Standard, faltbar',
    kurzbeschreibung: 'Der solide Begleiter für Wohnung, Einkauf und Spaziergang.',
    beschreibung: 'Faltbarer Stahlrohr-Rollator mit Sitzfläche, Einkaufskorb und Feststellbremsen. Die Griffhöhe lässt sich an die Körpergröße anpassen.',
    merkmale: ['Faltbar', 'Sitz und Korb', 'Feststellbremsen', 'Griffhöhe verstellbar'],
    attribute: { einsatzort: 'innen,aussen', gewichtKg: 9.5, belastbarkeitKg: 130, faltbar: true },
  }),
  artikel({
    id: id.rollatorLeicht, kategorieSlug: 'rollatoren', artikelnummer: 'SM-ROL-002', preisCents: 19900,
    name: 'Leichtgewicht-Rollator Aluminium',
    kurzbeschreibung: 'Leicht genug zum Tragen, stabil genug für jeden Tag.',
    beschreibung: 'Rollator aus Aluminium mit unter 7 kg Eigengewicht. Lässt sich mit einem Handgriff falten und gut ins Auto heben. Mit Sitz, Rückengurt und abnehmbarer Tasche.',
    merkmale: ['Unter 7 kg', 'Mit einem Handgriff faltbar', 'Sitz und Rückengurt', 'Tasche abnehmbar'],
    attribute: { einsatzort: 'innen,aussen', gewichtKg: 6.9, belastbarkeitKg: 130, faltbar: true },
  }),
  artikel({
    id: id.rollatorCarbon, kategorieSlug: 'rollatoren', artikelnummer: 'SM-ROL-003', preisCents: 44900, lieferzeitTage: 5,
    name: 'Carbon-Rollator ultraleicht',
    kurzbeschreibung: 'Besonders leicht — für alle, die den Rollator oft tragen.',
    beschreibung: 'Rollator mit Carbonrahmen und rund 5,5 kg Eigengewicht. Gefaltet steht er von allein, die Räder laufen leise.',
    merkmale: ['Rund 5,5 kg', 'Steht gefaltet von allein', 'Leise Räder', 'Sitz und Tasche'],
    attribute: { einsatzort: 'innen,aussen', gewichtKg: 5.5, belastbarkeitKg: 130, faltbar: true },
  }),
  artikel({
    id: id.rollatorGelaende, kategorieSlug: 'rollatoren', artikelnummer: 'SM-ROL-004', preisCents: 29900, lieferzeitTage: 5,
    name: 'Gelände-Rollator mit Luftreifen',
    kurzbeschreibung: 'Rollt ruhig über Waldwege, Kopfsteinpflaster und Wiesen.',
    beschreibung: 'Robuster Rollator mit großen Luftreifen, die Stöße dämpfen. Für unebene Wege und längere Strecken draußen.',
    merkmale: ['Luftreifen', 'Bis 150 kg', 'Faltbar', 'Sitz und Rückengurt'],
    attribute: { einsatzort: 'aussen', gewichtKg: 10, belastbarkeitKg: 150, faltbar: true },
  }),
  artikel({
    id: id.rollatorXl, kategorieSlug: 'rollatoren', artikelnummer: 'SM-ROL-005', preisCents: 34900, lieferzeitTage: 7,
    name: 'Rollator XL bis 200 kg',
    kurzbeschreibung: 'Verstärkter Rahmen und breiter Sitz.',
    beschreibung: 'Rollator mit verstärktem Rahmen für ein Körpergewicht bis 200 kg. Breite Sitzfläche und große Räder.',
    merkmale: ['Bis 200 kg', 'Breiter Sitz', 'Faltbar', 'Große Räder'],
    attribute: { einsatzort: 'innen,aussen', gewichtKg: 12, belastbarkeitKg: 200, faltbar: true },
  }),
  artikel({
    id: id.rollatorWohnung, kategorieSlug: 'rollatoren', artikelnummer: 'SM-ROL-006', preisCents: 13900, lieferzeitTage: 4,
    name: 'Wohnungsrollator schmal mit Tablett',
    kurzbeschreibung: 'Passt durch enge Türen und trägt Teller und Tasse mit.',
    beschreibung: 'Schmaler Rollator für die Wohnung mit Tablett und Ablagekorb. Leichtlaufrollen für glatte Böden — nicht für draußen gedacht.',
    merkmale: ['Rund 55 cm breit', 'Mit Tablett', 'Leichtlaufrollen'],
    attribute: { einsatzort: 'innen', gewichtKg: 7.5, belastbarkeitKg: 120, faltbar: false },
  }),

  // ── Rollstühle ──
  artikel({
    id: id.rollstuhlFalt, kategorieSlug: 'rollstuehle', artikelnummer: 'SM-RST-001', preisCents: 34900, mwstSatz: 7, lieferzeitTage: 5,
    name: 'Faltrollstuhl Standard',
    kurzbeschreibung: 'Zum Selbstfahren und Schieben, passt gefaltet in viele Kofferräume.',
    beschreibung: 'Faltrollstuhl mit Greifreifen, abnehmbaren Fußstützen und Feststellbremsen. In drei Sitzbreiten — gemessen wird die Hüftbreite im Sitzen plus etwa 2 cm.',
    merkmale: ['Faltbar', 'Fußstützen abnehmbar', 'Greifreifen', 'Sitzbreite 43, 46 oder 50 cm'],
    attribute: { faltbar: true, gewichtKg: 18, belastbarkeitKg: 120 },
  }),
  artikel({
    id: id.rollstuhlLeicht, kategorieSlug: 'rollstuehle', artikelnummer: 'SM-RST-002', preisCents: 54900, mwstSatz: 7, lieferzeitTage: 5,
    name: 'Leichtgewicht-Rollstuhl Aluminium, Sitzbreite 46 cm',
    kurzbeschreibung: 'Leichter zu heben und zu schieben.',
    beschreibung: 'Rollstuhl mit Aluminiumrahmen und rund 13 kg Gewicht. Hinterräder mit Steckachse, Rückenlehne klappbar.',
    merkmale: ['Rund 13 kg', 'Faltbar', 'Rückenlehne klappbar', 'Steckachsen'],
    attribute: { faltbar: true, gewichtKg: 13, belastbarkeitKg: 120, sitzbreiteCm: 46 },
  }),
  artikel({
    id: id.rollstuhlTransport, kategorieSlug: 'rollstuehle', artikelnummer: 'SM-RST-003', preisCents: 29900, mwstSatz: 7, lieferzeitTage: 5,
    name: 'Transportrollstuhl mit kleinen Rädern',
    kurzbeschreibung: 'Kompakt für Ausflüge — wird von einer Begleitperson geschoben.',
    beschreibung: 'Schieberollstuhl mit kleinen Hinterrädern und Begleitpersonen-Bremsen. Sehr kompakt gefaltet. Zum Selbstfahren nicht geeignet.',
    merkmale: ['Rund 11 kg', 'Faltbar', 'Bremsen für die Begleitperson', 'Nur zum Schieben'],
    attribute: { faltbar: true, gewichtKg: 11, belastbarkeitKg: 110, sitzbreiteCm: 43 },
  }),
  artikel({
    id: id.rollstuhlXl, kategorieSlug: 'rollstuehle', artikelnummer: 'SM-RST-004', preisCents: 79900, mwstSatz: 7, lieferzeitTage: 10,
    name: 'Rollstuhl XL bis 200 kg, Sitzbreite 56 cm',
    kurzbeschreibung: 'Verstärkter Rollstuhl mit breiter Sitzfläche.',
    beschreibung: 'Faltrollstuhl mit verstärktem Rahmen und doppeltem Kreuzgestänge für ein Körpergewicht bis 200 kg.',
    merkmale: ['Bis 200 kg', 'Sitzbreite 56 cm', 'Faltbar', 'Doppeltes Kreuzgestänge'],
    attribute: { faltbar: true, gewichtKg: 22, belastbarkeitKg: 200, sitzbreiteCm: 56 },
  }),

  // ── Gehhilfen ──
  artikel({
    id: id.gehstock, kategorieSlug: 'gehhilfen', artikelnummer: 'SM-GEH-001', preisCents: 2490,
    name: 'Gehstock höhenverstellbar mit Komfortgriff',
    kurzbeschreibung: 'Einfache Stütze für mehr Sicherheit beim Gehen.',
    beschreibung: 'Aluminium-Gehstock mit anatomisch geformtem Griff und rutschfestem Gummipuffer. In mehreren Stufen höhenverstellbar.',
    merkmale: ['Höhenverstellbar', 'Anatomischer Griff', 'Rutschfester Puffer'],
    attribute: { hoehenverstellbar: true, belastbarkeitKg: 120 },
  }),
  artikel({
    id: id.gehstockFaltbar, kategorieSlug: 'gehhilfen', artikelnummer: 'SM-GEH-002', preisCents: 2990,
    name: 'Faltbarer Gehstock',
    kurzbeschreibung: 'Passt zusammengefaltet in jede Handtasche.',
    beschreibung: 'Gehstock, der sich in vier Teile falten lässt. Mit Handschlaufe und höhenverstellbar.',
    merkmale: ['Faltbar', 'Mit Handschlaufe', 'Höhenverstellbar'],
    attribute: { hoehenverstellbar: true, belastbarkeitKg: 100 },
  }),
  artikel({
    id: id.unterarmgehstuetzen, kategorieSlug: 'gehhilfen', artikelnummer: 'SM-GEH-003', preisCents: 3490, mwstSatz: 7,
    name: 'Unterarmgehstützen, Paar',
    kurzbeschreibung: 'Entlasten die Beine, zum Beispiel nach einer Operation.',
    beschreibung: 'Paar Unterarmgehstützen mit ergonomischem Griff und Unterarmschale. Höhe in Stufen einstellbar.',
    merkmale: ['Paar', 'Ergonomischer Griff', 'Höhenverstellbar'],
    attribute: { hoehenverstellbar: true, belastbarkeitKg: 130 },
  }),
  artikel({
    id: produkt(111), kategorieSlug: 'gehhilfen', artikelnummer: 'SM-GEH-004', preisCents: 3990,
    name: 'Vierfuß-Gehstock',
    kurzbeschreibung: 'Steht von allein und gibt mehr Halt als ein einfacher Stock.',
    beschreibung: 'Gehstock mit vierfüßiger Standfläche und rutschfesten Kappen. Höhenverstellbar, für links und rechts verwendbar.',
    merkmale: ['Steht von allein', 'Vier rutschfeste Füße', 'Höhenverstellbar'],
    attribute: { hoehenverstellbar: true, belastbarkeitKg: 100 },
  }),
  artikel({
    id: produkt(112), kategorieSlug: 'gehhilfen', artikelnummer: 'SM-GEH-005', preisCents: 3490,
    name: 'Gehstock mit Klappsitz',
    kurzbeschreibung: 'Stock und Sitzgelegenheit in einem — für Pausen unterwegs.',
    beschreibung: 'Dreibeiniger Sitzstock, der sich zu einem kleinen Hocker aufklappen lässt. Für kurze Pausen, zum Beispiel beim Warten.',
    merkmale: ['Mit Klappsitz', 'Dreibein', 'Leicht'],
    attribute: { hoehenverstellbar: false, belastbarkeitKg: 100 },
  }),

  // ── Rampen ──
  artikel({
    id: produkt(113), kategorieSlug: 'rampen', artikelnummer: 'SM-RAM-001', preisCents: 2990, lieferzeitTage: 5,
    name: 'Schwellenrampe 2 cm',
    kurzbeschreibung: 'Für niedrige Türschwellen in der Wohnung.',
    beschreibung: 'Rutschfeste Gummirampe für Schwellen bis 2 cm. Wird einfach vor die Schwelle gelegt, auf Wunsch zuschneidbar.',
    merkmale: ['Für Schwellen bis 2 cm', 'Rutschfest', 'Ohne Bohren'],
  }),
  artikel({
    id: produkt(8), kategorieSlug: 'rampen', artikelnummer: 'SM-RAM-002', preisCents: 4490, lieferzeitTage: 5,
    name: 'Schwellenrampe 4 cm',
    kurzbeschreibung: 'Macht Türschwellen für Rollator und Rollstuhl überwindbar.',
    beschreibung: 'Rutschfeste Gummirampe für Schwellen bis 4 cm Höhe, zuschneidbar. Wird ohne Bohren verlegt.',
    merkmale: ['Für Schwellen bis 4 cm', 'Rutschfest', 'Ohne Bohren'],
  }),
  artikel({
    id: produkt(114), kategorieSlug: 'rampen', artikelnummer: 'SM-RAM-003', preisCents: 24900, lieferzeitTage: 7,
    name: 'Teleskop-Rampenschienen Aluminium, Paar',
    kurzbeschreibung: 'Für Stufen und den Weg ins Auto — ausziehbar und tragbar.',
    beschreibung: 'Zwei ausziehbare Aluminiumschienen für Rollstühle, je bis rund 2 m lang. Mit Tragegriff und rutschfester Lauffläche.',
    merkmale: ['Paar', 'Ausziehbar bis rund 2 m', 'Mit Tragegriff'],
  }),

  // ── Zubehör & Service ──
  artikel({
    id: id.rollatorTasche, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-001', preisCents: 2490,
    name: 'Rollator-Tasche wetterfest',
    kurzbeschreibung: 'Einkäufe trocken transportieren.',
    beschreibung: 'Wetterfeste Tasche mit Klettbefestigung für gängige Rollatorrahmen.',
    merkmale: ['Wetterfest', 'Klettbefestigung'],
  }),
  artikel({
    id: id.stockhalter, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-002', preisCents: 1290,
    name: 'Stockhalter für Rollator',
    kurzbeschreibung: 'Der Gehstock fährt sicher mit.',
    beschreibung: 'Halterung für einen Gehstock am Rollatorrahmen, passend für gängige Rohrdurchmesser.',
    merkmale: ['Werkzeuglose Montage'],
  }),
  artikel({
    id: id.rollatorTablett, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-003', preisCents: 2990,
    name: 'Rollator-Tablett',
    kurzbeschreibung: 'Teller und Tasse sicher durch die Wohnung tragen.',
    beschreibung: 'Tablett mit erhöhtem Rand, das auf die Griffe gängiger Rollatoren aufgesteckt wird.',
    merkmale: ['Erhöhter Rand', 'Aufsteckbar'],
  }),
  artikel({
    id: id.rollatorLicht, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-004', preisCents: 1990,
    name: 'LED-Licht für Rollator',
    kurzbeschreibung: 'Besser sehen und gesehen werden, wenn es dunkel wird.',
    beschreibung: 'Aufladbare LED-Leuchte zum Anklemmen an den Rollator- oder Rollstuhlrahmen.',
    merkmale: ['Aufladbar per USB', 'Zum Anklemmen'],
  }),
  artikel({
    id: id.eiskralle, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-005', preisCents: 1290,
    name: 'Eiskralle für Gehstock, klappbar',
    kurzbeschreibung: 'Mehr Halt auf Eis und Schnee.',
    beschreibung: 'Klappbarer Spike-Aufsatz für Gehstöcke und Unterarmgehstützen. Bei Nichtgebrauch nach oben klappen.',
    merkmale: ['Klappbar', 'Für gängige Stockdurchmesser'],
  }),
  artikel({
    id: id.gummipuffer, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-006', preisCents: 690,
    name: 'Ersatz-Gummipuffer für Gehstöcke, 2 Stück',
    kurzbeschreibung: 'Neuer Halt, wenn der alte Puffer abgelaufen ist.',
    beschreibung: 'Rutschfeste Gummipuffer für Gehstöcke und Unterarmgehstützen mit 19 mm Rohrdurchmesser.',
    merkmale: ['2 Stück', 'Für 19 mm Rohr'],
  }),
  artikel({
    id: id.sitzkissen, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-007', preisCents: 3990,
    name: 'Rollstuhl-Sitzkissen',
    kurzbeschreibung: 'Mehr Komfort bei langem Sitzen.',
    beschreibung: 'Schaumstoffkissen für Sitzbreiten von 43 bis 46 cm mit waschbarem Bezug und rutschfester Unterseite.',
    merkmale: ['Für Sitzbreite 43–46 cm', 'Bezug waschbar', 'Rutschfeste Unterseite'],
  }),
  artikel({
    id: id.regencape, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-008', preisCents: 3490,
    name: 'Regencape für Rollstuhlfahrer',
    kurzbeschreibung: 'Bleibt trocken, auch wenn es unterwegs regnet.',
    beschreibung: 'Wasserdichtes Cape mit Kapuze, das Oberkörper und Beine im Rollstuhl bedeckt.',
    merkmale: ['Wasserdicht', 'Mit Kapuze'],
  }),
  artikel({
    id: id.therapietisch, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-ZUB-009', preisCents: 6990, lieferzeitTage: 5,
    name: 'Therapietisch für Rollstühle',
    kurzbeschreibung: 'Eine Ablage zum Essen, Lesen und Schreiben im Rollstuhl.',
    beschreibung: 'Tischplatte, die auf die Armlehnen gängiger Rollstühle aufgesetzt wird.',
    merkmale: ['Auf Armlehnen aufsetzbar', 'Abwischbar'],
  }),
  artikel({
    id: id.einweisung, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-SRV-001', preisCents: 3900,
    name: 'Einweisung & Anpassung zu Hause',
    kurzbeschreibung: 'Wir stellen dein Hilfsmittel bei dir zu Hause richtig ein.',
    beschreibung: 'Termin vor Ort: Griff- oder Sitzhöhe einstellen, Bremsen erklären, erste Schritte begleiten.',
    merkmale: ['Termin vor Ort', 'Ca. 30 Minuten'],
  }),
  artikel({
    id: id.wartung, kategorieSlug: 'mobil-zubehoer', artikelnummer: 'SM-SRV-002', preisCents: 5900, lieferzeitTage: 7,
    name: 'Jährliche Rollstuhl- und Rollator-Wartung',
    kurzbeschreibung: 'Bremsen, Reifen und Gelenke einmal im Jahr prüfen lassen.',
    beschreibung: 'Sicherheitscheck mit Einstellung der Bremsen, Prüfung der Bereifung und der Gelenke.',
    merkmale: ['Abholung möglich', 'Prüfprotokoll'],
  }),

  // ══ Zuhause leichter leben ══

  // ── Greifhilfen ──
  artikel({
    id: produkt(9), kategorieSlug: 'greifhilfen', artikelnummer: 'SM-GRF-001', preisCents: 1990,
    name: 'Greifzange 82 cm, faltbar, mit Magnet',
    kurzbeschreibung: 'Dinge vom Boden aufheben, ohne sich zu bücken.',
    beschreibung: 'Leichte Greifzange mit rutschfesten Greifbacken und Magnetspitze für Schlüssel und Münzen. Zum Verstauen faltbar.',
    merkmale: ['82 cm lang', 'Faltbar', 'Magnetspitze'],
  }),
  artikel({
    id: produkt(123), kategorieSlug: 'greifhilfen', artikelnummer: 'SM-GRF-002', preisCents: 1290,
    name: 'Greifzange 60 cm',
    kurzbeschreibung: 'Die handliche Greifzange für Küche und Schrank.',
    beschreibung: 'Kurze, leichte Greifzange mit drehbarem Greifkopf für Dinge in hohen Regalen.',
    merkmale: ['60 cm lang', 'Drehbarer Greifkopf'],
  }),
  artikel({
    id: produkt(124), kategorieSlug: 'greifhilfen', artikelnummer: 'SM-GRF-003', preisCents: 990,
    name: 'Schlüsseldrehhilfe',
    kurzbeschreibung: 'Schlüssel leichter drehen, mit mehr Hebel.',
    beschreibung: 'Griff mit großer Hebelfläche, in den bis zu zwei Schlüssel eingesetzt werden.',
    merkmale: ['Für 2 Schlüssel', 'Großer Griff'],
  }),
  artikel({
    id: produkt(125), kategorieSlug: 'greifhilfen', artikelnummer: 'SM-GRF-004', preisCents: 1290,
    name: 'Universal-Deckelöffner',
    kurzbeschreibung: 'Schraubgläser und Flaschen ohne Kraftaufwand öffnen.',
    beschreibung: 'Öffner mit Hebelgriff für Schraubdeckel unterschiedlicher Größe.',
    merkmale: ['Für viele Deckelgrößen', 'Hebelgriff'],
  }),

  // ── Anziehhilfen ──
  artikel({
    id: produkt(10), kategorieSlug: 'anziehhilfen', artikelnummer: 'SM-ANZ-001', preisCents: 1490,
    name: 'Strumpfanzieher mit Haltebändern',
    kurzbeschreibung: 'Socken und Strümpfe anziehen, ohne sich weit vorzubeugen.',
    beschreibung: 'Anziehhilfe für Socken und Strümpfe mit langen Haltebändern. Nicht für Kompressionsstrümpfe gedacht.',
    merkmale: ['Lange Haltebänder', 'Für Socken und Strümpfe'],
  }),
  artikel({
    id: produkt(126), kategorieSlug: 'anziehhilfen', artikelnummer: 'SM-ANZ-002', preisCents: 990,
    name: 'Schuhlöffel extra lang, 60 cm',
    kurzbeschreibung: 'In die Schuhe schlüpfen, ohne sich zu bücken.',
    beschreibung: 'Langer Schuhlöffel mit Aufhängeöse.',
    merkmale: ['60 cm lang', 'Mit Aufhängeöse'],
  }),
  artikel({
    id: produkt(127), kategorieSlug: 'anziehhilfen', artikelnummer: 'SM-ANZ-003', preisCents: 790,
    name: 'Knöpfhilfe mit Reißverschlusshaken',
    kurzbeschreibung: 'Knöpfe und Reißverschlüsse mit einer Hand schließen.',
    beschreibung: 'Drahtschlaufe zum Knöpfen und Haken für Reißverschlüsse an einem dicken Griff.',
    merkmale: ['2 in 1', 'Dicker Griff'],
  }),
  artikel({
    id: produkt(128), kategorieSlug: 'anziehhilfen', artikelnummer: 'SM-ANZ-004', preisCents: 690,
    name: 'Elastische Schnürsenkel, 2 Paar',
    kurzbeschreibung: 'Schuhe einmal binden, danach nur noch hineinschlüpfen.',
    beschreibung: 'Elastische Schnürsenkel mit Schnellverschluss, auf Länge kürzbar.',
    merkmale: ['2 Paar', 'Kürzbar'],
  }),
  artikel({
    id: produkt(129), kategorieSlug: 'anziehhilfen', artikelnummer: 'SM-ANZ-005', preisCents: 1290,
    name: 'Anziehstab mit Haken',
    kurzbeschreibung: 'Kleidung heranziehen und hochschieben.',
    beschreibung: 'Leichter Stab mit Haken und Schieber zum An- und Ausziehen von Jacken, Hosen und Socken.',
    merkmale: ['Rund 70 cm lang', 'Haken und Schieber'],
  }),

  // ── Esshilfen ──
  artikel({
    id: produkt(11), kategorieSlug: 'esshilfen', artikelnummer: 'SM-ESS-001', preisCents: 2990,
    name: 'Besteck mit Griffverdickung, 3-teilig',
    kurzbeschreibung: 'Liegt sicher in der Hand, auch wenn das Greifen schwerfällt.',
    beschreibung: 'Set aus Messer, Gabel und Löffel mit dicken, weichen Griffen.',
    merkmale: ['3-teilig', 'Spülmaschinenfest'],
  }),
  artikel({
    id: produkt(130), kategorieSlug: 'esshilfen', artikelnummer: 'SM-ESS-002', preisCents: 1290,
    name: 'Tellerranderhöhung',
    kurzbeschreibung: 'Essen mit einer Hand auf die Gabel schieben.',
    beschreibung: 'Aufsteckbarer Rand für gängige Teller, damit nichts herunterrutscht.',
    merkmale: ['Aufsteckbar', 'Spülmaschinenfest'],
  }),
  artikel({
    id: produkt(131), kategorieSlug: 'esshilfen', artikelnummer: 'SM-ESS-003', preisCents: 990,
    name: 'Trinkbecher mit Nasenausschnitt',
    kurzbeschreibung: 'Trinken, ohne den Kopf weit nach hinten zu neigen.',
    beschreibung: 'Becher mit Aussparung für die Nase, transparent zur Kontrolle der Trinkmenge.',
    merkmale: ['Transparent', 'Spülmaschinenfest'],
  }),
  artikel({
    id: produkt(132), kategorieSlug: 'esshilfen', artikelnummer: 'SM-ESS-004', preisCents: 1190,
    name: 'Schnabelbecher mit zwei Griffen',
    kurzbeschreibung: 'Trinken im Sitzen oder Liegen, ohne zu verschütten.',
    beschreibung: 'Becher mit Deckel, Trinkschnabel und zwei Griffen.',
    merkmale: ['Zwei Griffe', 'Mit Deckel'],
  }),
  artikel({
    id: produkt(133), kategorieSlug: 'esshilfen', artikelnummer: 'SM-ESS-005', preisCents: 1490,
    name: 'Antirutschmatte, zuschneidbar',
    kurzbeschreibung: 'Teller und Schüsseln bleiben an Ort und Stelle.',
    beschreibung: 'Rutschfeste Matte von der Rolle, auf Wunschgröße zuschneidbar.',
    merkmale: ['Zuschneidbar', 'Waschbar'],
  }),
  artikel({
    id: produkt(134), kategorieSlug: 'esshilfen', artikelnummer: 'SM-ESS-006', preisCents: 3490,
    name: 'Frühstücksbrett für eine Hand',
    kurzbeschreibung: 'Brot streichen und schneiden mit nur einer Hand.',
    beschreibung: 'Schneidebrett mit Eckleisten, Haltedornen und Saugfüßen.',
    merkmale: ['Saugfüße', 'Haltedornen', 'Eckleisten'],
  }),

  // ── Aufstehhilfen ──
  artikel({
    id: produkt(135), kategorieSlug: 'aufstehhilfen', artikelnummer: 'SM-AUF-001', preisCents: 14900, lieferzeitTage: 5,
    name: 'Aufstehgriff freistehend für Bett und Sessel',
    kurzbeschreibung: 'Ein sicherer Haltegriff zum Hochziehen.',
    beschreibung: 'Freistehender Haltegriff, dessen Bodenplatte unter Bett oder Sessel geschoben wird. Ohne Bohren, Griffhöhe einstellbar.',
    merkmale: ['Ohne Bohren', 'Höhenverstellbar'],
  }),
  artikel({
    id: produkt(136), kategorieSlug: 'aufstehhilfen', artikelnummer: 'SM-AUF-002', preisCents: 3990,
    name: 'Möbelerhöher 10 cm, 4er-Set',
    kurzbeschreibung: 'Bett, Sessel oder Sofa um 10 cm höher stellen.',
    beschreibung: 'Vier stabile Erhöhungsklötze für Möbelbeine.',
    merkmale: ['4 Stück', '+10 cm'],
  }),
  artikel({
    id: produkt(137), kategorieSlug: 'aufstehhilfen', artikelnummer: 'SM-AUF-003', preisCents: 3490,
    name: 'Sitzerhöhungskissen keilförmig',
    kurzbeschreibung: 'Höher und leicht nach vorn geneigt sitzen.',
    beschreibung: 'Keilförmiges Schaumstoffkissen mit waschbarem Bezug für Stuhl, Sessel und Auto.',
    merkmale: ['Keilform', 'Bezug waschbar'],
  }),
  artikel({
    id: produkt(138), kategorieSlug: 'aufstehhilfen', artikelnummer: 'SM-AUF-004', preisCents: 5990,
    name: 'Bettgriff zum Einschieben',
    kurzbeschreibung: 'Halt beim Aufsetzen und Aufstehen aus dem Bett.',
    beschreibung: 'Haltegriff, der zwischen Lattenrost und Matratze geschoben und mit Gurt gesichert wird.',
    merkmale: ['Ohne Bohren', 'Mit Sicherungsgurt'],
  }),

  // ── Lese- & Sehhilfen ──
  artikel({
    id: produkt(13), kategorieSlug: 'lese-sehhilfen', artikelnummer: 'SM-SEH-001', preisCents: 2490,
    name: 'Leselupe mit LED-Licht, 3-fach',
    kurzbeschreibung: 'Kleine Schrift größer und heller sehen.',
    beschreibung: 'Handlupe mit 3-facher Vergrößerung und zuschaltbarem LED-Licht.',
    merkmale: ['3-fache Vergrößerung', 'LED-Licht'],
  }),
  artikel({
    id: produkt(139), kategorieSlug: 'lese-sehhilfen', artikelnummer: 'SM-SEH-002', preisCents: 2990,
    name: 'Hellfeldlupe zum Auflegen',
    kurzbeschreibung: 'Einfach über die Zeile schieben.',
    beschreibung: 'Lupe zum Auflegen auf Buch oder Zeitung, sammelt Umgebungslicht.',
    merkmale: ['Zum Auflegen', 'Ohne Batterie'],
  }),
  artikel({
    id: produkt(140), kategorieSlug: 'lese-sehhilfen', artikelnummer: 'SM-SEH-003', preisCents: 4990,
    name: 'Leselampe mit Tageslicht-LED',
    kurzbeschreibung: 'Helles, gleichmäßiges Licht zum Lesen und Handarbeiten.',
    beschreibung: 'Standleuchte mit flexiblem Arm, dimmbar, mit Tageslicht-Farbtemperatur.',
    merkmale: ['Dimmbar', 'Flexibler Arm'],
  }),
  artikel({
    id: produkt(141), kategorieSlug: 'lese-sehhilfen', artikelnummer: 'SM-SEH-004', preisCents: 2490,
    name: 'Umhängelupe mit Licht, 2-fach',
    kurzbeschreibung: 'Beide Hände frei für Handarbeiten.',
    beschreibung: 'Lupe mit Halsband und Brustauflage, 2-fache Vergrößerung, mit LED-Licht.',
    merkmale: ['Hände frei', '2-fache Vergrößerung', 'LED-Licht'],
  }),

  // ══ Bad & Toilette ══

  // ── Duschhilfen ──
  artikel({
    id: produkt(142), kategorieSlug: 'duschhilfen', artikelnummer: 'SM-DUS-001', preisCents: 3990,
    name: 'Duschhocker höhenverstellbar',
    kurzbeschreibung: 'Im Sitzen duschen, ohne lange stehen zu müssen.',
    beschreibung: 'Duschhocker mit rutschfesten Füßen, ohne Rückenlehne. Sitzhöhe einstellbar.',
    merkmale: ['Höhenverstellbar', 'Rutschfeste Füße'],
    attribute: { rueckenlehne: false, hoehenverstellbar: true, belastbarkeitKg: 130 },
  }),
  artikel({
    id: produkt(143), kategorieSlug: 'duschhilfen', artikelnummer: 'SM-DUS-002', preisCents: 6990, lieferzeitTage: 4,
    name: 'Duschstuhl mit Rücken- und Armlehnen',
    kurzbeschreibung: 'Bequem sitzen beim Duschen, mit Halt im Rücken.',
    beschreibung: 'Duschstuhl mit Rückenlehne und Armlehnen, die beim Hinsetzen und Aufstehen Halt geben.',
    merkmale: ['Rückenlehne', 'Armlehnen', 'Höhenverstellbar'],
    attribute: { rueckenlehne: true, hoehenverstellbar: true, belastbarkeitKg: 130 },
  }),
  artikel({
    id: produkt(144), kategorieSlug: 'duschhilfen', artikelnummer: 'SM-DUS-003', preisCents: 12900, lieferzeitTage: 5,
    name: 'Dusch-Klappsitz zur Wandmontage',
    kurzbeschreibung: 'Bei Bedarf herunterklappen, sonst platzsparend an der Wand.',
    beschreibung: 'Klappsitz zum Anschrauben an eine tragfähige Wand. Montage durch Fachkraft empfohlen.',
    merkmale: ['Klappbar', 'Wandmontage', 'Bis 150 kg'],
    attribute: { rueckenlehne: false, hoehenverstellbar: false, belastbarkeitKg: 150 },
  }),
  artikel({
    id: produkt(145), kategorieSlug: 'duschhilfen', artikelnummer: 'SM-DUS-004', preisCents: 2990,
    name: 'Haltegriff mit Saugnäpfen',
    kurzbeschreibung: 'Zusätzlicher Halt in Dusche und Bad, ohne Bohren.',
    beschreibung: 'Haltegriff mit zwei Saugnäpfen und Haftanzeige. Nur auf glatten, nicht porösen Fliesen verwenden und vor jeder Nutzung prüfen.',
    merkmale: ['Ohne Bohren', 'Haftanzeige'],
  }),
  artikel({
    id: produkt(146), kategorieSlug: 'duschhilfen', artikelnummer: 'SM-DUS-005', preisCents: 1990,
    name: 'Rutschfeste Duschmatte',
    kurzbeschreibung: 'Sicherer Stand auf nassem Boden.',
    beschreibung: 'Duschmatte mit Saugnäpfen und Abflusslöchern, waschbar.',
    merkmale: ['Saugnäpfe', 'Waschbar'],
  }),
  artikel({
    id: produkt(147), kategorieSlug: 'duschhilfen', artikelnummer: 'SM-DUS-006', preisCents: 990,
    name: 'Badeschwamm mit langem Stiel',
    kurzbeschreibung: 'Rücken und Füße waschen, ohne sich zu verrenken.',
    beschreibung: 'Schwamm an einem gebogenen, langen Griff.',
    merkmale: ['Langer Griff', 'Schwamm austauschbar'],
  }),

  // ── Badewannenhilfen ──
  artikel({
    id: produkt(148), kategorieSlug: 'badewannenhilfen', artikelnummer: 'SM-BAD-001', preisCents: 4990,
    name: 'Badewannenbrett',
    kurzbeschreibung: 'Im Sitzen auf dem Wannenrand duschen.',
    beschreibung: 'Brett, das quer auf den Wannenrand gelegt und mit verstellbaren Haltern gesichert wird. Mit Griff.',
    merkmale: ['Mit Griff', 'Verstellbare Halter'],
  }),
  artikel({
    id: produkt(149), kategorieSlug: 'badewannenhilfen', artikelnummer: 'SM-BAD-002', preisCents: 5990,
    name: 'Badewannensitz zum Einhängen',
    kurzbeschreibung: 'Ein Sitz in halber Höhe der Wanne.',
    beschreibung: 'Sitz, der in die Badewanne eingehängt wird, damit man nicht bis ganz nach unten muss.',
    merkmale: ['Einhängbar', 'Rutschfeste Auflage'],
  }),
  artikel({
    id: produkt(150), kategorieSlug: 'badewannenhilfen', artikelnummer: 'SM-BAD-003', preisCents: 54900, lieferzeitTage: 7,
    name: 'Badewannenlift mit Akku',
    kurzbeschreibung: 'Sanft in die Wanne hinein und wieder heraus.',
    beschreibung: 'Akkubetriebener Lift mit Handbedienung und abnehmbarem Bezug. Ohne Montage, zerlegbar zum Transport.',
    merkmale: ['Akkubetrieben', 'Ohne Montage', 'Bezug abnehmbar'],
  }),
  artikel({
    id: produkt(151), kategorieSlug: 'badewannenhilfen', artikelnummer: 'SM-BAD-004', preisCents: 4490,
    name: 'Badewannen-Klemmgriff',
    kurzbeschreibung: 'Halt beim Ein- und Aussteigen.',
    beschreibung: 'Haltegriff, der am Wannenrand festgeklemmt wird — ohne Bohren.',
    merkmale: ['Ohne Bohren', 'Für gängige Wannenränder'],
  }),

  // ── Toilettenhilfen ──
  artikel({
    id: produkt(152), kategorieSlug: 'toilettenhilfen', artikelnummer: 'SM-TOI-001', preisCents: 3990,
    name: 'Toilettensitzerhöhung 10 cm mit Deckel',
    kurzbeschreibung: 'Setzen und Aufstehen fallen leichter.',
    beschreibung: 'Aufsatz für gängige Toiletten, erhöht die Sitzfläche um 10 cm. Werkzeuglose Montage.',
    merkmale: ['+10 cm', 'Mit Deckel', 'Werkzeuglose Montage'],
  }),
  artikel({
    id: produkt(153), kategorieSlug: 'toilettenhilfen', artikelnummer: 'SM-TOI-002', preisCents: 7990,
    name: 'Toilettensitzerhöhung mit Armlehnen',
    kurzbeschreibung: 'Höher sitzen und sich an den Armlehnen abstützen.',
    beschreibung: 'Sitzerhöhung mit hochklappbaren Armlehnen, in der Höhe einstellbar.',
    merkmale: ['Armlehnen hochklappbar', 'Höhe einstellbar'],
  }),
  artikel({
    id: produkt(155), kategorieSlug: 'toilettenhilfen', artikelnummer: 'SM-TOI-003', preisCents: 6990,
    name: 'Toiletten-Stützgestell',
    kurzbeschreibung: 'Armlehnen rechts und links neben der Toilette.',
    beschreibung: 'Freistehendes Gestell mit zwei Armlehnen, das über die Toilette gestellt wird. Höhe und Breite einstellbar.',
    merkmale: ['Freistehend', 'Ohne Bohren', 'Höhenverstellbar'],
  }),
  artikel({
    id: id.toilettenstuhl, kategorieSlug: 'toilettenhilfen', artikelnummer: 'SM-TOI-004', preisCents: 9990, lieferzeitTage: 5,
    name: 'Toilettenstuhl mit Armlehnen',
    kurzbeschreibung: 'Eine Toilette direkt neben dem Bett, zum Beispiel für die Nacht.',
    beschreibung: 'Stuhl mit Toiletteneimer und Deckel, abnehmbaren Armlehnen und rutschfesten Füßen.',
    merkmale: ['Eimer mit Deckel', 'Armlehnen abnehmbar'],
  }),
  artikel({
    id: id.urinflasche, kategorieSlug: 'toilettenhilfen', artikelnummer: 'SM-TOI-005', preisCents: 990,
    name: 'Urinflasche für Männer mit Deckel',
    kurzbeschreibung: 'Wasserlassen im Bett oder unterwegs.',
    beschreibung: 'Urinflasche mit Deckel und Skala, rund 1 Liter Fassungsvermögen.',
    merkmale: ['Mit Deckel', 'Skala'],
  }),
  artikel({
    id: id.steckbecken, kategorieSlug: 'toilettenhilfen', artikelnummer: 'SM-TOI-006', preisCents: 1990,
    name: 'Steckbecken (Bettpfanne)',
    kurzbeschreibung: 'Zum Unterschieben, wenn jemand nicht aufstehen kann.',
    beschreibung: 'Flaches Steckbecken mit Griff und Deckel, leicht zu reinigen.',
    merkmale: ['Mit Deckel', 'Flache Form'],
  }),
  artikel({
    id: produkt(158), kategorieSlug: 'toilettenhilfen', artikelnummer: 'SM-TOI-007', preisCents: 9990, lieferzeitTage: 5,
    name: 'Wand-Stützklappgriff',
    kurzbeschreibung: 'Ein fester Griff neben der Toilette, der sich wegklappen lässt.',
    beschreibung: 'Klappgriff zur Wandmontage neben dem WC. Montage durch Fachkraft empfohlen.',
    merkmale: ['Hochklappbar', 'Wandmontage'],
  }),

  // ══ Pflege & Schlafen ══

  // ── Pflegebetten ──
  artikel({
    id: id.pflegebett, kategorieSlug: 'pflegebetten', artikelnummer: 'SM-PFB-001', preisCents: 129900, lieferzeitTage: 10,
    name: 'Pflegebett elektrisch, 90 × 200 cm',
    kurzbeschreibung: 'Liegen, Sitzen und Pflegen in der richtigen Höhe.',
    beschreibung: 'Elektrisch verstellbares Pflegebett mit Höhen-, Rücken- und Beinverstellung, Seitengittern und Aufrichter. Lieferung mit Aufbau. Ohne Matratze.',
    merkmale: ['Elektrisch verstellbar', 'Seitengitter', 'Mit Aufrichter', 'Lieferung mit Aufbau'],
  }),
  artikel({
    id: produkt(160), kategorieSlug: 'pflegebetten', artikelnummer: 'SM-PFB-002', preisCents: 14900, lieferzeitTage: 5,
    name: 'Aufrichthilfe freistehend (Bettgalgen)',
    kurzbeschreibung: 'Mit dem Haltegriff über dem Bett leichter aufsetzen.',
    beschreibung: 'Freistehender Galgen mit Triangelgriff für normale Betten, ohne Montage am Bett.',
    merkmale: ['Freistehend', 'Triangelgriff höhenverstellbar'],
  }),
  artikel({
    id: id.strickleiter, kategorieSlug: 'pflegebetten', artikelnummer: 'SM-PFB-003', preisCents: 1490,
    name: 'Bettleiter zum Aufrichten',
    kurzbeschreibung: 'Sich Sprosse für Sprosse im Bett aufsetzen.',
    beschreibung: 'Strickleiter mit Kunststoffsprossen, die am Bettende befestigt wird.',
    merkmale: ['Am Bettende befestigt', 'Kunststoffsprossen'],
  }),
  artikel({
    id: id.betttisch, kategorieSlug: 'pflegebetten', artikelnummer: 'SM-PFB-004', preisCents: 8990, lieferzeitTage: 5,
    name: 'Betttisch mit Rollen',
    kurzbeschreibung: 'Essen, Lesen und Schreiben im Bett oder im Sessel.',
    beschreibung: 'Höhenverstellbarer Beistelltisch mit Rollen, der über das Bett geschoben wird.',
    merkmale: ['Höhenverstellbar', 'Auf Rollen'],
  }),

  // ── Matratzen ──
  artikel({
    id: id.pflegematratze, kategorieSlug: 'matratzen', artikelnummer: 'SM-MAT-001', preisCents: 19900, lieferzeitTage: 7,
    name: 'Pflegebett-Matratze Kaltschaum, 90 × 200 cm',
    kurzbeschreibung: 'Passt in Pflegebetten und macht die Verstellung mit.',
    beschreibung: 'Unterteilte Kaltschaummatratze mit wasserdichtem, abwischbarem Bezug.',
    merkmale: ['90 × 200 cm', 'Bezug wasserdicht', 'Für verstellbare Betten'],
  }),
  artikel({
    id: produkt(165), kategorieSlug: 'matratzen', artikelnummer: 'SM-MAT-002', preisCents: 12900, lieferzeitTage: 5,
    name: 'Viskoschaum-Auflage 7 cm, 90 × 200 cm',
    kurzbeschreibung: 'Eine weiche Schicht auf der vorhandenen Matratze.',
    beschreibung: 'Matratzenauflage aus Viskoschaum, der sich der Körperform anpasst. Bezug abnehmbar und waschbar.',
    merkmale: ['7 cm hoch', 'Bezug waschbar'],
  }),
  artikel({
    id: id.matratzenschutz, kategorieSlug: 'matratzen', artikelnummer: 'SM-MAT-003', preisCents: 3490,
    name: 'Matratzenschutzbezug wasserdicht, 90 × 200 cm',
    kurzbeschreibung: 'Schützt die Matratze vor Feuchtigkeit.',
    beschreibung: 'Wasserdichter, atmungsaktiver Spannbezug, bei 60 °C waschbar.',
    merkmale: ['Wasserdicht', 'Bei 60 °C waschbar'],
  }),

  // ── Lagerung ──
  artikel({
    id: produkt(20), kategorieSlug: 'lagerung', artikelnummer: 'SM-LAG-001', preisCents: 4990,
    name: 'Seitenlagerungskissen',
    kurzbeschreibung: 'Stützt bequem in Seitenlage.',
    beschreibung: 'Langes, formstabiles Lagerungskissen mit waschbarem Bezug.',
    merkmale: ['Bezug waschbar', 'Formstabil'],
  }),
  artikel({
    id: produkt(168), kategorieSlug: 'lagerung', artikelnummer: 'SM-LAG-002', preisCents: 3490,
    name: 'Keilkissen für den Oberkörper',
    kurzbeschreibung: 'Mit erhöhtem Oberkörper liegen.',
    beschreibung: 'Keilförmiges Schaumstoffkissen mit waschbarem Bezug.',
    merkmale: ['Keilform', 'Bezug waschbar'],
  }),
  artikel({
    id: produkt(170), kategorieSlug: 'lagerung', artikelnummer: 'SM-LAG-003', preisCents: 3990,
    name: 'Beinhochlagerungskissen',
    kurzbeschreibung: 'Die Beine bequem hochlegen.',
    beschreibung: 'Stufenförmiges Kissen zum Hochlagern der Beine im Liegen.',
    merkmale: ['Stufenform', 'Bezug waschbar'],
  }),
  artikel({
    id: produkt(169), kategorieSlug: 'lagerung', artikelnummer: 'SM-LAG-004', preisCents: 2490,
    name: 'Fersenschutz, Paar',
    kurzbeschreibung: 'Polstert die Fersen beim langen Liegen.',
    beschreibung: 'Weich gepolsterte Fersenschoner mit Klettverschluss.',
    merkmale: ['Paar', 'Klettverschluss', 'Waschbar'],
  }),
  artikel({
    id: produkt(163), kategorieSlug: 'lagerung', artikelnummer: 'SM-LAG-005', preisCents: 3990,
    name: 'Rückenstütze verstellbar fürs Bett',
    kurzbeschreibung: 'Aufrecht im normalen Bett sitzen.',
    beschreibung: 'Rückenstütze mit mehrstufig einstellbarem Neigungswinkel.',
    merkmale: ['Mehrstufig einstellbar', 'Zusammenklappbar'],
  }),
  artikel({
    id: produkt(171), kategorieSlug: 'lagerung', artikelnummer: 'SM-LAG-006', preisCents: 2490,
    name: 'Knierolle',
    kurzbeschreibung: 'Entlastet in Rückenlage die Kniekehlen.',
    beschreibung: 'Feste Schaumstoffrolle mit waschbarem Bezug.',
    merkmale: ['Bezug waschbar'],
  }),

  // ── Transferhilfen ──
  artikel({
    id: produkt(21), kategorieSlug: 'transferhilfen', artikelnummer: 'SM-TRA-001', preisCents: 3990,
    name: 'Drehscheibe für den Transfer',
    kurzbeschreibung: 'Erleichtert das Umsetzen vom Bett in den Stuhl.',
    beschreibung: 'Rutschfeste Drehscheibe für die Füße, unterstützt Pflegende beim Umsetzen.',
    merkmale: ['Rutschfest', 'Drehbar'],
  }),
  artikel({
    id: produkt(172), kategorieSlug: 'transferhilfen', artikelnummer: 'SM-TRA-002', preisCents: 5990,
    name: 'Rutschbrett für den Transfer',
    kurzbeschreibung: 'Vom Bett in den Rollstuhl rutschen statt heben.',
    beschreibung: 'Glattes Brett mit Griffmulden als Brücke zwischen Bett, Rollstuhl und Stuhl.',
    merkmale: ['Griffmulden', 'Glatte Oberfläche'],
  }),
  artikel({
    id: produkt(173), kategorieSlug: 'transferhilfen', artikelnummer: 'SM-TRA-003', preisCents: 3990,
    name: 'Gleittuch',
    kurzbeschreibung: 'Im Bett hochrutschen und drehen mit weniger Kraft.',
    beschreibung: 'Schlauchförmiges Gleittuch mit sehr glatter Innenseite zum Umlagern im Bett.',
    merkmale: ['Schlauchform', 'Waschbar'],
  }),
  artikel({
    id: produkt(174), kategorieSlug: 'transferhilfen', artikelnummer: 'SM-TRA-004', preisCents: 3990,
    name: 'Transfergürtel mit Haltegriffen',
    kurzbeschreibung: 'Pflegende können sicher zugreifen.',
    beschreibung: 'Gepolsterter Gürtel mit mehreren Haltegriffen und Steckverschluss.',
    merkmale: ['Mehrere Griffe', 'Gepolstert'],
  }),

  // ══ Gesundheit & Wohlbefinden ══

  // ── Bandagen (nur Universalgrößen, solange keine Größe mitbestellt werden kann) ──
  artikel({
    id: produkt(175), kategorieSlug: 'bandagen', artikelnummer: 'SM-BAN-001', preisCents: 3990,
    name: 'Kniebandage mit Klettverschluss, Universalgröße',
    kurzbeschreibung: 'Gibt dem Knie Halt bei Bewegung.',
    beschreibung: 'Offene Kniebandage, die mit Klettverschlüssen an den Umfang angepasst wird. Für links und rechts.',
    merkmale: ['Universalgröße', 'Klettverschluss', 'Links und rechts'],
    attribute: { koerperstelle: 'knie' },
  }),
  artikel({
    id: produkt(176), kategorieSlug: 'bandagen', artikelnummer: 'SM-BAN-002', preisCents: 2490,
    name: 'Handgelenkbandage mit Klettverschluss, Universalgröße',
    kurzbeschreibung: 'Stützt das Handgelenk im Alltag.',
    beschreibung: 'Handgelenkbandage mit Daumenschlaufe, per Klettverschluss einstellbar. Für links und rechts.',
    merkmale: ['Universalgröße', 'Daumenschlaufe', 'Links und rechts'],
    attribute: { koerperstelle: 'handgelenk' },
  }),
  artikel({
    id: produkt(177), kategorieSlug: 'bandagen', artikelnummer: 'SM-BAN-003', preisCents: 2990,
    name: 'Sprunggelenkbandage mit Klettverschluss, Universalgröße',
    kurzbeschreibung: 'Gibt dem Knöchel Halt, passt in den Schuh.',
    beschreibung: 'Flache Sprunggelenkbandage mit Kreuzgurt, per Klettverschluss einstellbar.',
    merkmale: ['Universalgröße', 'Passt in den Schuh'],
    attribute: { koerperstelle: 'sprunggelenk' },
  }),
  artikel({
    id: produkt(178), kategorieSlug: 'bandagen', artikelnummer: 'SM-BAN-004', preisCents: 2490,
    name: 'Ellenbogenbandage mit Klettverschluss, Universalgröße',
    kurzbeschreibung: 'Stützt den Ellenbogen bei Belastung.',
    beschreibung: 'Ellenbogenbandage, per Klettverschluss an den Armumfang anpassbar.',
    merkmale: ['Universalgröße', 'Klettverschluss'],
    attribute: { koerperstelle: 'ellenbogen' },
  }),

  // ── Kompression (Strümpfe brauchen Maß/Größe — vorerst nur Anziehhilfen) ──
  artikel({
    id: produkt(179), kategorieSlug: 'kompression', artikelnummer: 'SM-KOM-001', preisCents: 3990,
    name: 'Anziehgestell für Kompressionsstrümpfe',
    kurzbeschreibung: 'Kompressionsstrümpfe anziehen, ohne an den Fuß reichen zu müssen.',
    beschreibung: 'Gestell, über das der Kompressionsstrumpf gespannt wird. Danach mit dem Fuß hineinsteigen und hochziehen.',
    merkmale: ['Für wadenlange und lange Strümpfe', 'Mit Griffen'],
  }),
  artikel({
    id: produkt(180), kategorieSlug: 'kompression', artikelnummer: 'SM-KOM-002', preisCents: 1990,
    name: 'Anziehhilfe-Gleitsocke für Kompressionsstrümpfe mit offener Spitze',
    kurzbeschreibung: 'Der Strumpf gleitet leichter über die Ferse.',
    beschreibung: 'Glatte Gleitsocke, die vor dem Kompressionsstrumpf über den Fuß gezogen und danach vorn herausgezogen wird.',
    merkmale: ['Für offene Fußspitze', 'Wiederverwendbar'],
  }),
  artikel({
    id: id.stuetzstruempfe, kategorieSlug: 'kompression', artikelnummer: 'SM-KOM-004', preisCents: 2490,
    name: 'Stütz-Kniestrümpfe mit leichter Kompression, Paar',
    kurzbeschreibung: 'Leichter Druck für lange Tage im Sitzen oder Stehen und auf Reisen.',
    beschreibung: 'Kniestrümpfe mit leichtem, nach oben abnehmendem Druck. Keine medizinischen Kompressionsstrümpfe — die werden nach Maß angepasst und brauchen ein Rezept. Die Größe richtet sich nach der Schuhgröße.',
    merkmale: ['Leichte Kompression', 'Kniestrumpf', 'Größe nach Schuhgröße'],
  }),
  artikel({
    id: produkt(181), kategorieSlug: 'kompression', artikelnummer: 'SM-KOM-003', preisCents: 1490,
    name: 'Gummierte Anziehhandschuhe, Universalgröße',
    kurzbeschreibung: 'Mehr Grip beim Anziehen und Glattstreichen der Strümpfe.',
    beschreibung: 'Handschuhe mit Noppen-Innenfläche zum Hochziehen und Glätten von Kompressionsstrümpfen.',
    merkmale: ['Paar', 'Noppen-Innenfläche'],
  }),

  // ── Messgeräte ──
  artikel({
    id: produkt(24), kategorieSlug: 'messgeraete', artikelnummer: 'SM-MES-001', preisCents: 4990,
    name: 'Blutdruckmessgerät Oberarm',
    kurzbeschreibung: 'Blutdruck zu Hause einfach selbst messen.',
    beschreibung: 'Vollautomatisches Oberarm-Messgerät mit großem Display, Universalmanschette und Speicher für zwei Personen. Klinisch validiert.',
    merkmale: ['Großes Display', 'Speicher für 2 Personen', 'Klinisch validiert'],
  }),
  artikel({
    id: produkt(182), kategorieSlug: 'messgeraete', artikelnummer: 'SM-MES-002', preisCents: 3990,
    name: 'Blutdruckmessgerät Handgelenk',
    kurzbeschreibung: 'Kompakt für zu Hause und unterwegs.',
    beschreibung: 'Vollautomatisches Handgelenk-Messgerät mit Positionsanzeige und Messwertspeicher. Klinisch validiert.',
    merkmale: ['Kompakt', 'Positionsanzeige', 'Klinisch validiert'],
  }),
  artikel({
    id: produkt(183), kategorieSlug: 'messgeraete', artikelnummer: 'SM-MES-003', preisCents: 990,
    name: 'Digitales Fieberthermometer',
    kurzbeschreibung: 'Schnell Fieber messen.',
    beschreibung: 'Digitalthermometer mit flexibler Spitze, Signalton und Speicher für den letzten Wert.',
    merkmale: ['Flexible Spitze', 'Signalton'],
  }),
  artikel({
    id: produkt(184), kategorieSlug: 'messgeraete', artikelnummer: 'SM-MES-004', preisCents: 2990,
    name: 'Pulsoximeter',
    kurzbeschreibung: 'Puls und Sauerstoffsättigung am Finger ablesen.',
    beschreibung: 'Fingerclip-Messgerät mit gut lesbarem Display. Ersetzt keine ärztliche Untersuchung.',
    merkmale: ['Fingerclip', 'Gut lesbares Display'],
  }),
  artikel({
    id: produkt(185), kategorieSlug: 'messgeraete', artikelnummer: 'SM-MES-005', preisCents: 2990,
    name: 'Personenwaage mit großer Anzeige',
    kurzbeschreibung: 'Das Gewicht gut lesbar im Blick.',
    beschreibung: 'Digitale Waage mit extra großen Ziffern und breiter, rutschfester Standfläche.',
    merkmale: ['Große Ziffern', 'Rutschfest'],
  }),

  // ── Atemtherapie ──
  artikel({
    id: id.inhalationsgeraet, kategorieSlug: 'atemtherapie', artikelnummer: 'SM-ATM-001', preisCents: 5990,
    name: 'Kompressor-Inhalationsgerät',
    kurzbeschreibung: 'Vernebelt Flüssigkeiten zum Einatmen.',
    beschreibung: 'Kompressor-Vernebler mit Mundstück, Masken für Erwachsene und Kinder und Ersatzfiltern.',
    merkmale: ['Mit Mundstück und Masken', 'Ersatzfilter'],
  }),
  artikel({
    id: id.verneblerset, kategorieSlug: 'atemtherapie', artikelnummer: 'SM-ATM-002', preisCents: 1990,
    name: 'Ersatz-Verneblerset',
    kurzbeschreibung: 'Neuer Vernebler, Schlauch und Mundstück.',
    beschreibung: 'Ersatzteile für Kompressor-Inhalationsgeräte mit Standardanschluss.',
    merkmale: ['Vernebler, Schlauch, Mundstück'],
  }),
  artikel({
    id: produkt(205), kategorieSlug: 'atemtherapie', artikelnummer: 'SM-ATM-003', preisCents: 1990,
    name: 'Peak-Flow-Meter',
    kurzbeschreibung: 'Die Ausatemstärke selbst messen und notieren.',
    beschreibung: 'Messgerät für den maximalen Ausatemstrom mit Skala und Markierungsreitern.',
    merkmale: ['Skala mit Reitern', 'Mundstück'],
  }),
  artikel({
    id: produkt(206), kategorieSlug: 'atemtherapie', artikelnummer: 'SM-ATM-004', preisCents: 1990,
    name: 'Inhalierhilfe für Dosieraerosole',
    kurzbeschreibung: 'Hilft, das Spray besser einzuatmen.',
    beschreibung: 'Vorschaltkammer (Spacer) mit Ventil für gängige Dosieraerosole.',
    merkmale: ['Mit Ventil', 'Für gängige Sprays'],
  }),
  artikel({
    id: produkt(207), kategorieSlug: 'atemtherapie', artikelnummer: 'SM-ATM-005', preisCents: 3490,
    name: 'Atemtrainer mit Ausatemwiderstand',
    kurzbeschreibung: 'Atemübungen gegen einen einstellbaren Widerstand.',
    beschreibung: 'Atemtrainer, bei dem gegen einen Widerstand ausgeatmet wird. Anwendung nach Anleitung von Ärztin, Arzt oder Physiotherapie.',
    merkmale: ['Einstellbarer Widerstand', 'Zerlegbar zur Reinigung'],
  }),

  // ── Wundversorgung ──
  artikel({
    id: produkt(26), kategorieSlug: 'wundversorgung', artikelnummer: 'SM-WUN-001', preisCents: 1290,
    name: 'Wundauflagen-Set steril',
    kurzbeschreibung: 'Sterile Auflagen für die Versorgung kleiner Wunden.',
    beschreibung: 'Set aus einzeln verpackten, sterilen Wundauflagen in verschiedenen Größen.',
    merkmale: ['Steril', 'Verschiedene Größen'],
  }),
  artikel({
    id: produkt(208), kategorieSlug: 'wundversorgung', artikelnummer: 'SM-WUN-002', preisCents: 690,
    name: 'Sterile Mullkompressen 10 × 10 cm, 25 Stück',
    kurzbeschreibung: 'Zum Abdecken und Reinigen.',
    beschreibung: 'Einzeln steril verpackte Mullkompressen.',
    merkmale: ['25 Stück', 'Einzeln steril verpackt'],
  }),
  artikel({
    id: produkt(209), kategorieSlug: 'wundversorgung', artikelnummer: 'SM-WUN-003', preisCents: 790,
    name: 'Pflaster-Sortiment',
    kurzbeschreibung: 'Pflaster in gängigen Größen für die Hausapotheke.',
    beschreibung: 'Hautfreundliche Wundschnellverbände in verschiedenen Größen.',
    merkmale: ['Verschiedene Größen', 'Hautfreundlich'],
  }),
  artikel({
    id: produkt(210), kategorieSlug: 'wundversorgung', artikelnummer: 'SM-WUN-004', preisCents: 590,
    name: 'Elastische Fixierbinden, 5 Stück',
    kurzbeschreibung: 'Hält Auflagen und Kompressen an Ort und Stelle.',
    beschreibung: 'Elastische Mullbinden, 8 cm breit.',
    merkmale: ['5 Stück', '8 cm breit'],
  }),
  artikel({
    id: produkt(211), kategorieSlug: 'wundversorgung', artikelnummer: 'SM-WUN-005', preisCents: 790,
    name: 'Fixiervlies von der Rolle',
    kurzbeschreibung: 'Zuschneidbar zum Fixieren von Auflagen.',
    beschreibung: 'Hautfreundliches, dehnbares Fixiervlies, 10 cm × 10 m.',
    merkmale: ['10 cm × 10 m', 'Zuschneidbar'],
  }),

  // ══ Hygiene & Inkontinenz ══

  // ── Inkontinenzartikel ──
  artikel({
    id: produkt(212), kategorieSlug: 'inkontinenzartikel', artikelnummer: 'SM-INK-001', preisCents: 990,
    name: 'Inkontinenz-Einlagen leicht, 30 Stück',
    kurzbeschreibung: 'Dünner, diskreter Schutz bei leichtem Harnverlust.',
    beschreibung: 'Dünne Einlagen mit Klebestreifen und Geruchsbindung.',
    merkmale: ['30 Stück', 'Klebestreifen', 'Geruchsbindung'],
    attribute: { saugstaerke: 'leicht' },
  }),
  artikel({
    id: produkt(213), kategorieSlug: 'inkontinenzartikel', artikelnummer: 'SM-INK-002', preisCents: 1290,
    name: 'Inkontinenz-Einlagen normal, 28 Stück',
    kurzbeschreibung: 'Sicherer Schutz für den Alltag.',
    beschreibung: 'Anatomisch geformte Einlagen mit Auslaufsperren und Klebestreifen.',
    merkmale: ['28 Stück', 'Auslaufsperren'],
    attribute: { saugstaerke: 'mittel' },
  }),
  artikel({
    id: produkt(234), kategorieSlug: 'inkontinenzartikel', artikelnummer: 'SM-INK-003', preisCents: 1590,
    name: 'Inkontinenz-Einlagen stark, 20 Stück',
    kurzbeschreibung: 'Hohe Saugleistung, auch für die Nacht.',
    beschreibung: 'Große, saugstarke Einlagen mit Auslaufsperren, zur Fixierung mit Netzhose.',
    merkmale: ['20 Stück', 'Für die Nacht geeignet'],
    attribute: { saugstaerke: 'stark' },
  }),
  artikel({
    id: produkt(214), kategorieSlug: 'inkontinenzartikel', artikelnummer: 'SM-INK-004', preisCents: 1290,
    name: 'Inkontinenz-Einlagen für Männer, 20 Stück',
    kurzbeschreibung: 'Speziell für die männliche Anatomie geformt.',
    beschreibung: 'Taschenförmige Einlagen mit Klebestreifen für eng anliegende Unterwäsche.',
    merkmale: ['20 Stück', 'Taschenform'],
    attribute: { saugstaerke: 'mittel' },
  }),
  artikel({
    id: id.pants, kategorieSlug: 'inkontinenzartikel', artikelnummer: 'SM-INK-007', preisCents: 1590,
    name: 'Inkontinenz-Pants zum Hochziehen, 14 Stück',
    kurzbeschreibung: 'Wird wie Unterwäsche getragen, auch für unterwegs und die Nacht.',
    beschreibung: 'Einweg-Pants mit hoher Saugleistung und dehnbarem Bund. Die Größe richtet sich nach dem Hüftumfang.',
    merkmale: ['14 Stück', 'Wie Unterwäsche', 'Größe nach Hüftumfang'],
    attribute: { saugstaerke: 'stark' },
  }),
  artikel({
    id: produkt(215), kategorieSlug: 'inkontinenzartikel', artikelnummer: 'SM-INK-005', preisCents: 690,
    name: 'Fixierhosen (Netzhosen), 5 Stück, Universalgröße',
    kurzbeschreibung: 'Halten große Einlagen sicher an ihrem Platz.',
    beschreibung: 'Dehnbare, waschbare Netzhosen zur Fixierung von Inkontinenzeinlagen.',
    merkmale: ['5 Stück', 'Waschbar', 'Sehr dehnbar'],
  }),
  artikel({
    id: produkt(216), kategorieSlug: 'inkontinenzartikel', artikelnummer: 'SM-INK-006', preisCents: 2490,
    name: 'Waschbare Bettschutzeinlage, 75 × 90 cm',
    kurzbeschreibung: 'Schützt das Bett, immer wieder verwendbar.',
    beschreibung: 'Saugfähige Mehrweg-Unterlage mit wasserdichter Unterseite, bis 90 °C waschbar.',
    merkmale: ['Mehrweg', 'Bis 90 °C waschbar'],
  }),

  // ── Hautpflege ──
  artikel({
    id: produkt(28), kategorieSlug: 'hautpflege', artikelnummer: 'SM-HAU-001', preisCents: 990,
    name: 'Hautschutzcreme, 200 ml',
    kurzbeschreibung: 'Pflegt und schützt beanspruchte Haut.',
    beschreibung: 'Parfümfreie Hautschutzcreme für Haut, die häufig mit Feuchtigkeit in Kontakt kommt.',
    merkmale: ['Parfümfrei', '200 ml'],
  }),
  artikel({
    id: produkt(217), kategorieSlug: 'hautpflege', artikelnummer: 'SM-HAU-002', preisCents: 890,
    name: 'Waschlotion pH-hautneutral, 500 ml',
    kurzbeschreibung: 'Milde Reinigung für empfindliche Haut.',
    beschreibung: 'Seifenfreie Waschlotion mit pH 5,5, parfümfrei.',
    merkmale: ['pH 5,5', 'Seifenfrei', '500 ml'],
  }),
  artikel({
    id: produkt(218), kategorieSlug: 'hautpflege', artikelnummer: 'SM-HAU-003', preisCents: 990,
    name: 'Reinigungsschaum ohne Wasser, 400 ml',
    kurzbeschreibung: 'Reinigen, wenn Waschen schwierig ist.',
    beschreibung: 'Schaum zur Reinigung ohne Wasser, zum Beispiel im Bett. Mit Tuch abnehmen, kein Abspülen nötig.',
    merkmale: ['Ohne Wasser', '400 ml'],
  }),
  artikel({
    id: produkt(219), kategorieSlug: 'hautpflege', artikelnummer: 'SM-HAU-004', preisCents: 990,
    name: 'Pflegelotion für trockene Haut, 500 ml',
    kurzbeschreibung: 'Feuchtigkeit für trockene, empfindliche Haut.',
    beschreibung: 'Parfümfreie Körperlotion mit Urea.',
    merkmale: ['Mit Urea', 'Parfümfrei', '500 ml'],
  }),

  // ── Hygiene ──
  artikel({
    id: produkt(29), kategorieSlug: 'hygiene', artikelnummer: 'SM-HYG-001', preisCents: 690,
    name: 'Einmal-Waschhandschuhe vorgefeuchtet, 10 Stück',
    kurzbeschreibung: 'Waschen ohne Wasser, zum Beispiel im Bett.',
    beschreibung: 'Vorgefeuchtete Waschhandschuhe für die Körperpflege, parfümfrei.',
    merkmale: ['10 Stück', 'Parfümfrei'],
  }),
  artikel({
    id: produkt(220), kategorieSlug: 'hygiene', artikelnummer: 'SM-HYG-002', preisCents: 990,
    name: 'Einmalhandschuhe Nitril, Größe M, 100 Stück',
    kurzbeschreibung: 'Schutz für Pflegende bei der Körperpflege.',
    beschreibung: 'Puderfreie, latexfreie Nitrilhandschuhe in Größe M.',
    merkmale: ['100 Stück', 'Latexfrei', 'Größe M'],
  }),
  artikel({
    id: produkt(221), kategorieSlug: 'hygiene', artikelnummer: 'SM-HYG-003', preisCents: 990,
    name: 'Einmalhandschuhe Nitril, Größe L, 100 Stück',
    kurzbeschreibung: 'Schutz für Pflegende bei der Körperpflege.',
    beschreibung: 'Puderfreie, latexfreie Nitrilhandschuhe in Größe L.',
    merkmale: ['100 Stück', 'Latexfrei', 'Größe L'],
  }),
  artikel({
    id: produkt(222), kategorieSlug: 'hygiene', artikelnummer: 'SM-HYG-004', preisCents: 1290,
    name: 'Einweg-Bettschutzunterlagen 60 × 90 cm, 25 Stück',
    kurzbeschreibung: 'Schützt das Bett bei der Pflege.',
    beschreibung: 'Saugfähige Einmal-Unterlagen mit wasserdichter Unterseite.',
    merkmale: ['25 Stück', '60 × 90 cm'],
  }),
  artikel({
    id: produkt(223), kategorieSlug: 'hygiene', artikelnummer: 'SM-HYG-005', preisCents: 2990,
    name: 'Aufblasbares Haarwaschbecken',
    kurzbeschreibung: 'Haare waschen im Bett.',
    beschreibung: 'Aufblasbares Becken mit Nackenmulde und Ablaufschlauch.',
    merkmale: ['Mit Ablaufschlauch', 'Nackenmulde'],
  }),
  artikel({
    id: produkt(224), kategorieSlug: 'hygiene', artikelnummer: 'SM-HYG-006', preisCents: 590,
    name: 'Mundpflegestäbchen, 25 Stück',
    kurzbeschreibung: 'Mundpflege, wenn Zähneputzen nicht geht.',
    beschreibung: 'Schaumstoffstäbchen zur Mundpflege, einzeln verpackt.',
    merkmale: ['25 Stück', 'Einzeln verpackt'],
  }),

  // ══ Bewegung & Training ══

  // ── Bewegungstrainer ──
  artikel({
    id: produkt(36), kategorieSlug: 'bewegungstrainer', artikelnummer: 'SM-BEW-001', preisCents: 3990,
    name: 'Pedaltrainer für Arme und Beine',
    kurzbeschreibung: 'Im Sitzen in Bewegung bleiben.',
    beschreibung: 'Kompakter Pedaltrainer mit einstellbarem Widerstand, auf dem Boden oder dem Tisch nutzbar.',
    merkmale: ['Einstellbarer Widerstand', 'Für Arme und Beine'],
  }),
  artikel({
    id: produkt(225), kategorieSlug: 'bewegungstrainer', artikelnummer: 'SM-BEW-002', preisCents: 24900, lieferzeitTage: 7,
    name: 'Motorisierter Arm- und Beintrainer',
    kurzbeschreibung: 'Bewegt mit Motorunterstützung, wenn die eigene Kraft nicht reicht.',
    beschreibung: 'Elektrischer Bewegungstrainer mit aktivem und passivem Modus, einstellbarer Geschwindigkeit und Fernbedienung.',
    merkmale: ['Aktiv und passiv', 'Fernbedienung', 'Geschwindigkeit einstellbar'],
  }),
  artikel({
    id: produkt(226), kategorieSlug: 'bewegungstrainer', artikelnummer: 'SM-BEW-003', preisCents: 2990,
    name: 'Fußwippe',
    kurzbeschreibung: 'Füße im Sitzen auf und ab bewegen.',
    beschreibung: 'Wippe für Fußübungen im Sitzen, zum Beispiel am Schreibtisch oder im Sessel.',
    merkmale: ['Rutschfeste Unterseite', 'Für die Nutzung im Sitzen'],
  }),

  // ── Therapiegeräte ──
  artikel({
    id: produkt(227), kategorieSlug: 'therapiegeraete', artikelnummer: 'SM-THE-001', preisCents: 3990,
    name: 'TENS-Gerät mit 2 Kanälen',
    kurzbeschreibung: 'Reizstrom-Gerät für zu Hause.',
    beschreibung: 'TENS-Gerät mit zwei Kanälen, voreingestellten Programmen und Elektroden. Vor der Anwendung ärztlich abklären, insbesondere mit Herzschrittmacher.',
    merkmale: ['2 Kanäle', 'Mit Elektroden'],
  }),
  artikel({
    id: produkt(228), kategorieSlug: 'therapiegeraete', artikelnummer: 'SM-THE-002', preisCents: 790,
    name: 'Kalt-Warm-Kompresse',
    kurzbeschreibung: 'Im Gefrierfach kühlen oder im Wasserbad erwärmen.',
    beschreibung: 'Wiederverwendbare Gelkompresse mit Stoffhülle.',
    merkmale: ['Wiederverwendbar', 'Mit Stoffhülle'],
  }),
  artikel({
    id: produkt(229), kategorieSlug: 'therapiegeraete', artikelnummer: 'SM-THE-003', preisCents: 3990,
    name: 'Infrarot-Wärmelampe',
    kurzbeschreibung: 'Wärme gezielt auf eine Körperstelle richten.',
    beschreibung: 'Infrarotlampe mit neigbarem Kopf und Zeitschaltung.',
    merkmale: ['Neigbar', 'Zeitschaltung'],
  }),

  // ── Trainingszubehör ──
  artikel({
    id: produkt(38), kategorieSlug: 'trainingszubehoer', artikelnummer: 'SM-TRN-001', preisCents: 1990,
    name: 'Therapieband-Set, 3 Stärken',
    kurzbeschreibung: 'Drei Stärken für Übungen zu Hause.',
    beschreibung: 'Set aus drei latexfreien Therapiebändern mit Übungsanleitung.',
    merkmale: ['3 Stärken', 'Latexfrei', 'Mit Anleitung'],
  }),
  artikel({
    id: produkt(230), kategorieSlug: 'trainingszubehoer', artikelnummer: 'SM-TRN-002', preisCents: 1490,
    name: 'Therapieknete, 3 Stärken',
    kurzbeschreibung: 'Finger und Hände kneten und trainieren.',
    beschreibung: 'Drei Dosen Therapieknete in unterschiedlicher Festigkeit.',
    merkmale: ['3 Stärken', 'Mit Anleitung'],
  }),
  artikel({
    id: produkt(231), kategorieSlug: 'trainingszubehoer', artikelnummer: 'SM-TRN-003', preisCents: 2490,
    name: 'Balancekissen',
    kurzbeschreibung: 'Gleichgewicht im Stehen oder Sitzen üben.',
    beschreibung: 'Luftgefülltes Kissen mit Noppenseite, Luftmenge einstellbar.',
    merkmale: ['Luftmenge einstellbar', 'Noppenseite'],
  }),
  artikel({
    id: produkt(232), kategorieSlug: 'trainingszubehoer', artikelnummer: 'SM-TRN-004', preisCents: 790,
    name: 'Igelbälle, 2 Stück',
    kurzbeschreibung: 'Für Hand- und Fußübungen.',
    beschreibung: 'Zwei Noppenbälle mit rund 8 cm Durchmesser.',
    merkmale: ['2 Stück', 'Rund 8 cm'],
  }),
  artikel({
    id: produkt(233), kategorieSlug: 'trainingszubehoer', artikelnummer: 'SM-TRN-005', preisCents: 990,
    name: 'Fingertrainer',
    kurzbeschreibung: 'Jeden Finger einzeln kräftigen.',
    beschreibung: 'Handtrainer mit einzeln gefederten Fingertasten.',
    merkmale: ['Einzeln gefederte Tasten'],
  }),
];

// ── Varianten (Größen/Ausführungen) & Komplementärketten ──
// Hat ein Produkt Varianten, muss beim Bestellen eine gewählt werden (Server
// prüft das bei WARENKORB_UEBERNOMMEN). `label` ist der Anzeigename; die SKU
// legt die Reihenfolge fest (Varianten werden nach SKU sortiert). Größentabellen
// sind übliche Richtwerte — mit dem Lieferanten abzugleichen.

const variante = (n: number) => `51000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

export const VARIANTEN: { id: string; productId: string; sku: string; attribute: Record<string, string | number> }[] = [
  { id: variante(1), productId: id.rollstuhlFalt, sku: 'SM-RST-001-1', attribute: { sitzbreiteCm: 43, label: 'Sitzbreite 43 cm' } },
  { id: variante(2), productId: id.rollstuhlFalt, sku: 'SM-RST-001-2', attribute: { sitzbreiteCm: 46, label: 'Sitzbreite 46 cm' } },
  { id: variante(3), productId: id.rollstuhlFalt, sku: 'SM-RST-001-3', attribute: { sitzbreiteCm: 50, label: 'Sitzbreite 50 cm' } },
  { id: variante(4), productId: id.stuetzstruempfe, sku: 'SM-KOM-004-1', attribute: { label: 'Größe S (Schuhgröße 35–38)' } },
  { id: variante(5), productId: id.stuetzstruempfe, sku: 'SM-KOM-004-2', attribute: { label: 'Größe M (Schuhgröße 39–42)' } },
  { id: variante(6), productId: id.stuetzstruempfe, sku: 'SM-KOM-004-3', attribute: { label: 'Größe L (Schuhgröße 43–46)' } },
  { id: variante(7), productId: id.stuetzstruempfe, sku: 'SM-KOM-004-4', attribute: { label: 'Größe XL (Schuhgröße 47–50)' } },
  { id: variante(8), productId: id.pants, sku: 'SM-INK-007-1', attribute: { label: 'Größe M (Hüfte 80–120 cm)' } },
  { id: variante(9), productId: id.pants, sku: 'SM-INK-007-2', attribute: { label: 'Größe L (Hüfte 100–140 cm)' } },
  { id: variante(10), productId: id.pants, sku: 'SM-INK-007-3', attribute: { label: 'Größe XL (Hüfte 120–160 cm)' } },
];

type Beziehung = {
  sourceProductId: string;
  targetProductId: string;
  relationType: 'zubehoer' | 'ersatzteil' | 'dienstleistung';
  sourceVariantId: string | null;
};

const passt = (quelle: string, typ: Beziehung['relationType'], ziele: string[]): Beziehung[] =>
  ziele.map((ziel) => ({ sourceProductId: quelle, targetProductId: ziel, relationType: typ, sourceVariantId: null }));

const ROLLATOR_ZUBEHOER = [id.rollatorTasche, id.stockhalter, id.rollatorLicht];
const ROLLSTUHL_ZUBEHOER = [id.sitzkissen, id.regencape, id.therapietisch];
const STOCK_ZUBEHOER = [id.eiskralle, id.gummipuffer];

export const BEZIEHUNGEN: Beziehung[] = [
  ...[id.rollatorStandard, id.rollatorLeicht, id.rollatorCarbon, id.rollatorGelaende, id.rollatorXl].flatMap((r) => [
    ...passt(r, 'zubehoer', ROLLATOR_ZUBEHOER),
    ...passt(r, 'dienstleistung', [id.einweisung, id.wartung]),
  ]),
  ...passt(id.rollatorStandard, 'zubehoer', [id.rollatorTablett]),
  ...passt(id.rollatorWohnung, 'dienstleistung', [id.einweisung]),
  ...[id.rollstuhlFalt, id.rollstuhlLeicht, id.rollstuhlXl].flatMap((r) => [
    ...passt(r, 'zubehoer', ROLLSTUHL_ZUBEHOER),
    ...passt(r, 'dienstleistung', [id.einweisung, id.wartung]),
  ]),
  ...passt(id.rollstuhlTransport, 'zubehoer', [id.sitzkissen, id.regencape]),
  ...passt(id.rollstuhlTransport, 'dienstleistung', [id.wartung]),
  ...[id.gehstock, id.gehstockFaltbar, id.unterarmgehstuetzen].flatMap((s) => passt(s, 'zubehoer', STOCK_ZUBEHOER)),
  ...passt(id.pflegebett, 'zubehoer', [id.pflegematratze, id.matratzenschutz, id.betttisch, id.strickleiter]),
  ...passt(id.pflegebett, 'dienstleistung', [id.einweisung]),
  ...passt(id.inhalationsgeraet, 'ersatzteil', [id.verneblerset]),
  ...passt(id.toilettenstuhl, 'zubehoer', [id.urinflasche, id.steckbecken]),
];
