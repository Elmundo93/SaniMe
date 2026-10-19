// Reine Seed-Daten (kein DB-Zugriff) — von catalog.seed.ts geschrieben und vom
// Invarianten-Test catalog.seed-data.spec.ts gegen @sanime/domain geprüft.
// Alles Platzhalter (CLAUDE.md: keine echten Hersteller-/Preis-/HiMi-Daten
// vortäuschen): Produktnamen tragen „(Platzhalter)“, HiMi-Nummern beginnen
// mit 00.00.00.

export const SUPPLIER_ID = '30000000-0000-0000-0000-000000000001';

export const MANUFACTURER_IDS = {
  mobiltech: '20000000-0000-0000-0000-000000000001',
  aktivcare: '20000000-0000-0000-0000-000000000002',
  hausfit: '20000000-0000-0000-0000-000000000003',
} as const;

export const MANUFACTURERS = [
  { id: MANUFACTURER_IDS.mobiltech, name: 'MobilTech (Platzhalter)' },
  { id: MANUFACTURER_IDS.aktivcare, name: 'AktivCare (Platzhalter)' },
  { id: MANUFACTURER_IDS.hausfit, name: 'HausFit (Platzhalter)' },
];

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
  angebot: SeedAngebot;
}

const produkt = (n: number) => `40000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
export const PRODUKT_IDS = {
  rollstuhlAktiv: produkt(1),
  rollstuhlKomfort: produkt(2),
  gehstock: produkt(3),
  rollatorLeicht: produkt(4),
  rollatorOutdoor: produkt(5),
  rollatorWohnung: produkt(6),
  rollatorTasche: produkt(30),
  stockhalter: produkt(31),
  bremsset: produkt(32),
  einweisung: produkt(33),
  sitzkissen: produkt(34),
  wartung: produkt(35),
};

const himi = (n: number) => `00.00.00.${String(n).padStart(4, '0')}`;

export const PRODUKTE: SeedProdukt[] = [
  // ── Mobil bleiben ──
  {
    id: PRODUKT_IDS.rollstuhlAktiv, kategorieSlug: 'rollstuehle', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Rollstuhl Aktiv SB 40 — Basisversorgung (Platzhalter)', hilfsmittelnummer: himi(1),
    kurzbeschreibung: 'Leichter Faltrollstuhl für drinnen und kurze Wege draußen.',
    beschreibung: 'Leichter Standardrollstuhl, faltbar, Sitzbreite 40 cm.', artikelnummer: 'MT-RS-040',
    merkmale: ['Faltbar', 'Leichtgewicht 13 kg', 'Bremsgriffe', 'Fußrasten verstellbar'],
    attribute: { faltbar: true, gewichtKg: 13, belastbarkeitKg: 120, sitzbreiteCm: 40 },
    requiresApproval: true, angebot: { selbstzahlerPreisCents: 34900, copayCents: 1000, lieferzeitTage: 3 },
  },
  {
    id: PRODUKT_IDS.rollstuhlKomfort, kategorieSlug: 'rollstuehle', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Rollstuhl Komfort Plus SB 40 (Platzhalter)', hilfsmittelnummer: himi(12),
    kurzbeschreibung: 'Bequemer Rollstuhl für langes Sitzen.',
    beschreibung: 'Komfortrollstuhl mit verbesserter Polsterung und einstellbarer Rückenlehne.', artikelnummer: 'AC-RS-K40',
    merkmale: ['Faltbar', 'Ergonomische Rückenlehne', 'Anti-Dekubituspolsterung'],
    attribute: { faltbar: true, gewichtKg: 17, belastbarkeitKg: 130, sitzbreiteCm: 40 },
    requiresApproval: true, angebot: { selbstzahlerPreisCents: 59900, copayCents: 1000, lieferzeitTage: 5 },
  },
  {
    id: PRODUKT_IDS.rollatorLeicht, kategorieSlug: 'rollatoren', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Leichtgewicht-Rollator Alu (Platzhalter)', hilfsmittelnummer: himi(21),
    kurzbeschreibung: 'Leicht genug zum Tragen, stabil genug für jeden Tag.',
    beschreibung: 'Faltbarer Aluminium-Rollator mit Sitzfläche, Korb und Stockhalter-Aufnahme.', artikelnummer: 'MT-RL-ALU',
    merkmale: ['Nur 6,5 kg', 'Faltbar', 'Mit Sitz und Korb', 'Höhenverstellbare Griffe'],
    attribute: { einsatzort: 'innen,aussen', gewichtKg: 6.5, belastbarkeitKg: 130, faltbar: true },
    requiresApproval: true, angebot: { selbstzahlerPreisCents: 14900, copayCents: 1000, lieferzeitTage: 3 },
  },
  {
    id: PRODUKT_IDS.rollatorOutdoor, kategorieSlug: 'rollatoren', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Outdoor-Rollator mit Luftreifen (Platzhalter)', hilfsmittelnummer: himi(22),
    kurzbeschreibung: 'Rollt ruhig über Waldwege, Kopfstein und Bordsteine.',
    beschreibung: 'Robuster Rollator mit großen Luftreifen für unebene Wege, belastbar bis 150 kg.', artikelnummer: 'AC-RO-150',
    merkmale: ['Luftreifen', 'Belastbar bis 150 kg', 'Faltbar', 'Rückengurt'],
    attribute: { einsatzort: 'aussen', gewichtKg: 9.5, belastbarkeitKg: 150, faltbar: true },
    requiresApproval: true, angebot: { selbstzahlerPreisCents: 24900, copayCents: 1000, lieferzeitTage: 5 },
  },
  {
    id: PRODUKT_IDS.rollatorWohnung, kategorieSlug: 'rollatoren', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Wohnungsrollator schmal mit Tablett (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Passt durch enge Türen und trägt Teller und Tasse mit.',
    beschreibung: 'Schmaler Rollator für die Wohnung mit Tablett und Korb. Nicht für draußen gedacht.', artikelnummer: 'HF-WR-01',
    merkmale: ['Nur 54 cm breit', 'Mit Tablett', 'Leichtlaufrollen'],
    attribute: { einsatzort: 'innen', gewichtKg: 7.2, belastbarkeitKg: 120, faltbar: false },
    requiresApproval: false, angebot: { copayCents: 12900, lieferzeitTage: 4 },
  },
  {
    id: PRODUKT_IDS.gehstock, kategorieSlug: 'gehhilfen', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Gehstock Basic (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Einfache Stütze für mehr Sicherheit beim Gehen.',
    beschreibung: 'Einfacher, höhenverstellbarer Gehstock ohne Rezeptpflicht.', artikelnummer: 'AC-GS-01',
    merkmale: ['Höhenverstellbar', 'Rutschfester Griff'],
    attribute: { hoehenverstellbar: true, belastbarkeitKg: 100 },
    requiresApproval: false, angebot: { copayCents: 2490, lieferzeitTage: 3 },
  },
  {
    id: produkt(7), kategorieSlug: 'gehhilfen', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Unterarmgehstützen-Paar (Platzhalter)', hilfsmittelnummer: himi(31),
    kurzbeschreibung: 'Entlastet Beine nach einer Operation oder Verletzung.',
    beschreibung: 'Paar Unterarmgehstützen mit anatomischem Griff, höhenverstellbar.', artikelnummer: 'MT-UG-02',
    merkmale: ['Paar', 'Anatomischer Griff', 'Höhenverstellbar'],
    attribute: { hoehenverstellbar: true, belastbarkeitKg: 130 },
    requiresApproval: false, angebot: { selbstzahlerPreisCents: 3990, copayCents: 500, lieferzeitTage: 2 },
  },
  {
    id: produkt(8), kategorieSlug: 'rampen', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Schwellenrampe 4 cm (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Macht Türschwellen für Rollator und Rollstuhl überwindbar.',
    beschreibung: 'Rutschfeste Gummirampe für Schwellen bis 4 cm Höhe, zuschneidbar.', artikelnummer: 'HF-SR-4',
    merkmale: ['Für Schwellen bis 4 cm', 'Rutschfest', 'Ohne Bohren'],
    requiresApproval: false, angebot: { copayCents: 3990, lieferzeitTage: 5 },
  },

  // ── Zubehör & Service (Ziele der Komplementärketten) ──
  {
    id: PRODUKT_IDS.rollatorTasche, kategorieSlug: 'mobil-zubehoer', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Rollator-Tasche wetterfest (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Einkäufe trocken transportieren.',
    beschreibung: 'Wetterfeste Tasche mit Klettbefestigung für gängige Rollatorrahmen.', artikelnummer: 'HF-RT-01',
    merkmale: ['Wetterfest', 'Klettbefestigung'], requiresApproval: false, angebot: { copayCents: 1990, lieferzeitTage: 3 },
  },
  {
    id: PRODUKT_IDS.stockhalter, kategorieSlug: 'mobil-zubehoer', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Stockhalter für Rollator (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Der Gehstock fährt sicher mit.',
    beschreibung: 'Halterung für einen Gehstock am Rollatorrahmen.', artikelnummer: 'MT-SH-01',
    merkmale: ['Werkzeuglose Montage'], requiresApproval: false, angebot: { copayCents: 990, lieferzeitTage: 3 },
  },
  {
    id: PRODUKT_IDS.bremsset, kategorieSlug: 'mobil-zubehoer', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Ersatz-Bremsset Leichtgewicht-Rollator (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Neue Bremsen für den Leichtgewicht-Rollator.',
    beschreibung: 'Bremszüge und Bremsklötze, passend nur für die Ausführung mit 54 cm Sitzhöhe.', artikelnummer: 'MT-BS-54',
    merkmale: ['Bremszüge', 'Bremsklötze'], requiresApproval: false, angebot: { copayCents: 1490, lieferzeitTage: 5 },
  },
  {
    id: PRODUKT_IDS.einweisung, kategorieSlug: 'mobil-zubehoer', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Einweisung & Anpassung zu Hause (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Wir stellen dein Hilfsmittel bei dir zu Hause richtig ein.',
    beschreibung: 'Termin vor Ort: Griffhöhe einstellen, Bremsen erklären, erste Schritte begleiten.', artikelnummer: 'AC-SV-EIN',
    merkmale: ['Termin vor Ort', 'Ca. 30 Minuten'], requiresApproval: false, angebot: { copayCents: 2900, lieferzeitTage: 3 },
  },
  {
    id: PRODUKT_IDS.sitzkissen, kategorieSlug: 'mobil-zubehoer', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Rollstuhl-Sitzkissen (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Mehr Komfort bei langem Sitzen.',
    beschreibung: 'Schaumstoffkissen für Sitzbreite 40 cm mit waschbarem Bezug.', artikelnummer: 'AC-SK-40',
    merkmale: ['Sitzbreite 40 cm', 'Bezug waschbar'], requiresApproval: false, angebot: { copayCents: 3490, lieferzeitTage: 4 },
  },
  {
    id: PRODUKT_IDS.wartung, kategorieSlug: 'mobil-zubehoer', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Jährliche Rollstuhl-Wartung (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Bremsen, Reifen und Gelenke einmal im Jahr prüfen lassen.',
    beschreibung: 'Sicherheitscheck mit Einstellung der Bremsen und Prüfung der Bereifung.', artikelnummer: 'MT-SV-WAR',
    merkmale: ['Abholung möglich'], requiresApproval: false, angebot: { copayCents: 4900, lieferzeitTage: 7 },
  },

  // ── Zuhause leichter leben ──
  {
    id: produkt(9), kategorieSlug: 'greifhilfen', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Greifzange 80 cm (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Dinge vom Boden aufheben, ohne sich zu bücken.',
    beschreibung: 'Leichte Greifzange mit Magnetspitze und rutschfesten Greifbacken.', artikelnummer: 'HF-GZ-80',
    merkmale: ['80 cm lang', 'Magnetspitze'], requiresApproval: false, angebot: { copayCents: 1490, lieferzeitTage: 3 },
  },
  {
    id: produkt(10), kategorieSlug: 'anziehhilfen', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Strumpfanzieher (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Socken und Strümpfe anziehen, ohne sich weit vorzubeugen.',
    beschreibung: 'Anziehhilfe für Socken und Strümpfe mit langen Haltebändern.', artikelnummer: 'HF-SA-01',
    merkmale: ['Lange Haltebänder'], requiresApproval: false, angebot: { copayCents: 1290, lieferzeitTage: 3 },
  },
  {
    id: produkt(11), kategorieSlug: 'esshilfen', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Besteck mit Griffverdickung (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Liegt sicher in der Hand, auch wenn das Greifen schwerfällt.',
    beschreibung: 'Set aus Messer, Gabel und Löffel mit dicken, weichen Griffen.', artikelnummer: 'HF-EB-03',
    merkmale: ['3-teilig', 'Spülmaschinenfest'], requiresApproval: false, angebot: { copayCents: 2490, lieferzeitTage: 3 },
  },
  {
    id: produkt(12), kategorieSlug: 'aufstehhilfen', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Aufstehhilfe für Bett und Sessel (Platzhalter)', hilfsmittelnummer: himi(41),
    kurzbeschreibung: 'Ein sicherer Haltegriff zum Hochziehen.',
    beschreibung: 'Freistehender Haltegriff, der unter Bett oder Sessel geschoben wird.', artikelnummer: 'AC-AH-01',
    merkmale: ['Ohne Bohren', 'Höhenverstellbar'], attribute: { hoehenverstellbar: true, belastbarkeitKg: 130 },
    requiresApproval: true, angebot: { selbstzahlerPreisCents: 12900, copayCents: 1000, lieferzeitTage: 5 },
  },
  {
    id: produkt(13), kategorieSlug: 'lese-sehhilfen', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Leselupe mit LED-Licht (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Kleine Schrift größer und heller sehen.',
    beschreibung: 'Handlupe mit 3-facher Vergrößerung und zuschaltbarem LED-Licht.', artikelnummer: 'HF-LL-3X',
    merkmale: ['3-fache Vergrößerung', 'LED-Licht'], requiresApproval: false, angebot: { copayCents: 1990, lieferzeitTage: 3 },
  },

  // ── Bad & Toilette ──
  {
    id: produkt(14), kategorieSlug: 'duschhilfen', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Duschhocker höhenverstellbar (Platzhalter)', hilfsmittelnummer: himi(51),
    kurzbeschreibung: 'Im Sitzen duschen, ohne lange stehen zu müssen.',
    beschreibung: 'Duschhocker mit rutschfesten Füßen, ohne Rückenlehne.', artikelnummer: 'AC-DH-01',
    merkmale: ['Höhenverstellbar', 'Rutschfeste Füße'], attribute: { rueckenlehne: false, hoehenverstellbar: true, belastbarkeitKg: 110 },
    requiresApproval: false, angebot: { selbstzahlerPreisCents: 4990, copayCents: 500, lieferzeitTage: 3 },
  },
  {
    id: produkt(15), kategorieSlug: 'duschhilfen', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Duschstuhl mit Rückenlehne (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Bequem sitzen beim Duschen, mit Halt im Rücken.',
    beschreibung: 'Duschstuhl mit Rücken- und Armlehnen, bis 130 kg.', artikelnummer: 'HF-DS-RL',
    merkmale: ['Rückenlehne', 'Armlehnen'], attribute: { rueckenlehne: true, hoehenverstellbar: true, belastbarkeitKg: 130 },
    requiresApproval: false, angebot: { copayCents: 5990, lieferzeitTage: 4, availability: 'unavailable' },
  },
  {
    id: produkt(16), kategorieSlug: 'badewannenhilfen', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Badewannenlift (Platzhalter)', hilfsmittelnummer: himi(52),
    kurzbeschreibung: 'Sanft in die Wanne hinein und wieder heraus.',
    beschreibung: 'Akkubetriebener Badewannenlift mit abnehmbarem Bezug.', artikelnummer: 'MT-BL-01',
    merkmale: ['Akkubetrieben', 'Bezug abnehmbar'], requiresApproval: true, angebot: { selbstzahlerPreisCents: 49900, copayCents: 1000, lieferzeitTage: 7 },
  },
  {
    id: produkt(17), kategorieSlug: 'toilettenhilfen', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Toilettensitzerhöhung 10 cm (Platzhalter)', hilfsmittelnummer: himi(53),
    kurzbeschreibung: 'Setzen und Aufstehen fallen leichter.',
    beschreibung: 'Aufsatz für gängige Toiletten, erhöht die Sitzfläche um 10 cm.', artikelnummer: 'AC-TS-10',
    merkmale: ['+10 cm', 'Werkzeuglose Montage'], requiresApproval: false, angebot: { selbstzahlerPreisCents: 3990, copayCents: 500, lieferzeitTage: 3 },
  },

  // ── Pflege & Schlafen ──
  {
    id: produkt(18), kategorieSlug: 'pflegebetten', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Pflegebett elektrisch (Platzhalter)', hilfsmittelnummer: himi(61),
    kurzbeschreibung: 'Liegen, Sitzen und Pflegen in der richtigen Höhe.',
    beschreibung: 'Elektrisch verstellbares Pflegebett mit Seitengittern.', artikelnummer: 'MT-PB-E1',
    merkmale: ['Elektrisch verstellbar', 'Seitengitter'], requiresApproval: true, angebot: { selbstzahlerPreisCents: 119900, copayCents: 1000, lieferzeitTage: 7 },
  },
  {
    id: produkt(19), kategorieSlug: 'matratzen', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Wechseldruckmatratze (Platzhalter)', hilfsmittelnummer: himi(62),
    kurzbeschreibung: 'Verteilt den Druck beim langen Liegen.',
    beschreibung: 'Wechseldruck-Auflage mit leisem Kompressor.', artikelnummer: 'AC-WM-01',
    merkmale: ['Leiser Kompressor'], requiresApproval: true, angebot: { selbstzahlerPreisCents: 29900, copayCents: 1000, lieferzeitTage: 5 },
  },
  {
    id: produkt(20), kategorieSlug: 'lagerung', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Seitenlagerungskissen (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Stützt bequem in Seitenlage.',
    beschreibung: 'Formstabiles Lagerungskissen mit waschbarem Bezug.', artikelnummer: 'HF-LK-01',
    merkmale: ['Bezug waschbar'], requiresApproval: false, angebot: { copayCents: 3990, lieferzeitTage: 4 },
  },
  {
    id: produkt(21), kategorieSlug: 'transferhilfen', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Drehscheibe für den Transfer (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Erleichtert das Umsetzen vom Bett in den Stuhl.',
    beschreibung: 'Rutschfeste Drehscheibe, unterstützt Pflegende beim Umsetzen.', artikelnummer: 'AC-DS-01',
    merkmale: ['Rutschfest'], requiresApproval: false, angebot: { copayCents: 2990, lieferzeitTage: 4 },
  },

  // ── Gesundheit & Wohlbefinden ──
  {
    id: produkt(22), kategorieSlug: 'bandagen', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Kniebandage (Platzhalter)', hilfsmittelnummer: himi(71),
    kurzbeschreibung: 'Gibt dem Knie Halt bei Bewegung.',
    beschreibung: 'Atmungsaktive Kniebandage mit Silikonpelotte.', artikelnummer: 'AC-KB-01',
    merkmale: ['Atmungsaktiv'], requiresApproval: false, angebot: { selbstzahlerPreisCents: 6990, copayCents: 1000, lieferzeitTage: 3 },
  },
  {
    id: produkt(23), kategorieSlug: 'kompression', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Kompressionsstrümpfe Klasse 2 (Platzhalter)', hilfsmittelnummer: himi(72),
    kurzbeschreibung: 'Unterstützen die Venen in den Beinen.',
    beschreibung: 'Wadenlange Kompressionsstrümpfe, nach Maß.', artikelnummer: 'MT-KS-K2',
    merkmale: ['Nach Maß', 'Wadenlang'], requiresApproval: false, angebot: { selbstzahlerPreisCents: 8990, copayCents: 1000, lieferzeitTage: 7 },
  },
  {
    id: produkt(24), kategorieSlug: 'messgeraete', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Blutdruckmessgerät Oberarm (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Blutdruck zu Hause einfach selbst messen.',
    beschreibung: 'Vollautomatisches Oberarm-Messgerät mit großem Display.', artikelnummer: 'HF-BD-01',
    merkmale: ['Großes Display', 'Speicher für 2 Personen'], requiresApproval: false, angebot: { copayCents: 4990, lieferzeitTage: 3 },
  },
  {
    id: produkt(25), kategorieSlug: 'atemtherapie', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Inhalationsgerät (Platzhalter)', hilfsmittelnummer: himi(73),
    kurzbeschreibung: 'Verneblung von Medikamenten zum Einatmen.',
    beschreibung: 'Kompressor-Inhalationsgerät mit Mundstück und Maske.', artikelnummer: 'MT-IH-01',
    merkmale: ['Mit Maske'], requiresApproval: false, angebot: { selbstzahlerPreisCents: 7990, copayCents: 1000, lieferzeitTage: 3 },
  },
  {
    id: produkt(26), kategorieSlug: 'wundversorgung', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Wundauflagen-Set (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Sterile Auflagen für die Versorgung kleiner Wunden.',
    beschreibung: 'Set aus sterilen Wundauflagen in verschiedenen Größen.', artikelnummer: 'AC-WA-SET',
    merkmale: ['Steril', 'Verschiedene Größen'], requiresApproval: false, angebot: { copayCents: 1290, lieferzeitTage: 2 },
  },

  // ── Hygiene & Inkontinenz ──
  {
    id: produkt(27), kategorieSlug: 'inkontinenzartikel', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Inkontinenz-Einlagen (Platzhalter)', hilfsmittelnummer: himi(81),
    kurzbeschreibung: 'Diskreter Schutz für den Alltag.',
    beschreibung: 'Atmungsaktive Einlagen, Monatsbedarf.', artikelnummer: 'HF-IE-M',
    merkmale: ['Monatsbedarf', 'Atmungsaktiv'], requiresApproval: false, angebot: { selbstzahlerPreisCents: 2490, copayCents: 1000, lieferzeitTage: 3 },
  },
  {
    id: produkt(28), kategorieSlug: 'hautpflege', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Hautschutzcreme (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Pflegt und schützt empfindliche Haut.',
    beschreibung: 'Hautschutzcreme für beanspruchte Haut, parfümfrei.', artikelnummer: 'HF-HS-01',
    merkmale: ['Parfümfrei'], requiresApproval: false, angebot: { copayCents: 890, lieferzeitTage: 2 },
  },
  {
    id: produkt(29), kategorieSlug: 'hygiene', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Einmal-Waschhandschuhe (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Waschen ohne Wasser, zum Beispiel im Bett.',
    beschreibung: 'Vorgefeuchtete Waschhandschuhe für die Körperpflege.', artikelnummer: 'HF-WH-10',
    merkmale: ['10 Stück'], requiresApproval: false, angebot: { copayCents: 690, lieferzeitTage: 2 },
  },

  // ── Bewegung & Training ──
  {
    id: produkt(36), kategorieSlug: 'bewegungstrainer', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Pedaltrainer für Arme und Beine (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Im Sitzen in Bewegung bleiben.',
    beschreibung: 'Kompakter Pedaltrainer mit einstellbarem Widerstand.', artikelnummer: 'MT-PT-01',
    merkmale: ['Einstellbarer Widerstand'], requiresApproval: false, angebot: { copayCents: 3990, lieferzeitTage: 4 },
  },
  {
    id: produkt(37), kategorieSlug: 'therapiegeraete', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Motorbewegungsschiene Knie (Platzhalter)', hilfsmittelnummer: himi(91),
    kurzbeschreibung: 'Bewegt das Knie nach einer Operation passiv.',
    beschreibung: 'Leihgerät zur passiven Bewegung des Kniegelenks.', artikelnummer: 'AC-MS-K',
    merkmale: ['Leihgerät'], requiresApproval: true, angebot: { selbstzahlerPreisCents: 89900, copayCents: 1000, lieferzeitTage: 3 },
  },
  {
    id: produkt(38), kategorieSlug: 'trainingszubehoer', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Therapieband-Set (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Drei Stärken für Übungen zu Hause.',
    beschreibung: 'Set aus drei Therapiebändern mit Übungsanleitung.', artikelnummer: 'HF-TB-3',
    merkmale: ['3 Stärken', 'Mit Anleitung'], requiresApproval: false, angebot: { copayCents: 1490, lieferzeitTage: 3 },
  },
];

// ── Varianten & Komplementärketten ──

export const VARIANTEN = [
  { id: '50000000-0000-0000-0000-000000000001', productId: PRODUKT_IDS.rollatorLeicht, sku: 'MT-RL-ALU-54', attribute: { sitzhoeheCm: 54, label: 'Sitzhöhe 54 cm' } },
  { id: '50000000-0000-0000-0000-000000000002', productId: PRODUKT_IDS.rollatorLeicht, sku: 'MT-RL-ALU-62', attribute: { sitzhoeheCm: 62, label: 'Sitzhöhe 62 cm' } },
];

export const BEZIEHUNGEN: {
  sourceProductId: string;
  targetProductId: string;
  relationType: 'zubehoer' | 'ersatzteil' | 'dienstleistung';
  sourceVariantId: string | null;
}[] = [
  { sourceProductId: PRODUKT_IDS.rollatorLeicht, targetProductId: PRODUKT_IDS.rollatorTasche, relationType: 'zubehoer', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollatorLeicht, targetProductId: PRODUKT_IDS.stockhalter, relationType: 'zubehoer', sourceVariantId: null },
  // Passt nur zur 54-cm-Ausführung — erscheint bei 62 cm nicht.
  { sourceProductId: PRODUKT_IDS.rollatorLeicht, targetProductId: PRODUKT_IDS.bremsset, relationType: 'ersatzteil', sourceVariantId: VARIANTEN[0].id },
  { sourceProductId: PRODUKT_IDS.rollatorLeicht, targetProductId: PRODUKT_IDS.einweisung, relationType: 'dienstleistung', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollatorOutdoor, targetProductId: PRODUKT_IDS.rollatorTasche, relationType: 'zubehoer', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollatorOutdoor, targetProductId: PRODUKT_IDS.einweisung, relationType: 'dienstleistung', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollstuhlAktiv, targetProductId: PRODUKT_IDS.sitzkissen, relationType: 'zubehoer', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollstuhlAktiv, targetProductId: PRODUKT_IDS.wartung, relationType: 'dienstleistung', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollstuhlKomfort, targetProductId: PRODUKT_IDS.sitzkissen, relationType: 'zubehoer', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollstuhlKomfort, targetProductId: PRODUKT_IDS.wartung, relationType: 'dienstleistung', sourceVariantId: null },
];
