// Entwicklungs-/Testkatalog: Kassenartikel-Platzhalter (HiMi-Nr. 00.00.00.*), damit
// der Rezept-Pfad (Versorgungsauswahl, Einreichung, Kauf ohne Rezept) lokal und in
// den Tests durchspielbar bleibt, solange es noch keine echten Kassenartikel gibt.
// Wird NIE in Produktion geseedet (catalog.seed.ts, `mitEntwicklungskatalog`) —
// CLAUDE.md: keine HiMi-Nummern vortäuschen. Dazu ein dauerhaft nicht lieferbarer
// Artikel und ein ausführungsabhängiges Ersatzteil für die Tests.

import { PRODUKT_IDS as KATALOG_IDS, type SeedProdukt } from './catalog.seed-data';

/** Kassenartikel-Platzhalter nie in Produktion. `SEED_ENTWICKLUNGSKATALOG=aus`
 * schaltet sie auch lokal ab, um nur den echten Katalog zu sehen. */
export function mitEntwicklungskatalog(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== 'production' && env.SEED_ENTWICKLUNGSKATALOG !== 'aus';
}

export const MANUFACTURER_IDS = {
  mobiltech: '20000000-0000-0000-0000-000000000001',
  aktivcare: '20000000-0000-0000-0000-000000000002',
  hausfit: '20000000-0000-0000-0000-000000000003',
} as const;

export const ENTWICKLUNG_MANUFACTURERS = [
  { id: MANUFACTURER_IDS.mobiltech, name: 'MobilTech (Platzhalter)' },
  { id: MANUFACTURER_IDS.aktivcare, name: 'AktivCare (Platzhalter)' },
  { id: MANUFACTURER_IDS.hausfit, name: 'HausFit (Platzhalter)' },
];

const produkt = (n: number) => `40000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
export const PRODUKT_IDS = {
  rollstuhlAktiv: produkt(1),
  rollstuhlKomfort: produkt(2),
  rollatorLeicht: produkt(4),
  rollatorOutdoor: produkt(5),
  bremsset: produkt(32),
};

const himi = (n: number) => `00.00.00.${String(n).padStart(4, '0')}`;

export const ENTWICKLUNG_PRODUKTE: SeedProdukt[] = [
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
    id: produkt(7), kategorieSlug: 'gehhilfen', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Unterarmgehstützen-Paar (Platzhalter)', hilfsmittelnummer: himi(31),
    kurzbeschreibung: 'Entlastet Beine nach einer Operation oder Verletzung.',
    beschreibung: 'Paar Unterarmgehstützen mit anatomischem Griff, höhenverstellbar.', artikelnummer: 'MT-UG-02',
    merkmale: ['Paar', 'Anatomischer Griff', 'Höhenverstellbar'],
    attribute: { hoehenverstellbar: true, belastbarkeitKg: 130 },
    requiresApproval: false, angebot: { selbstzahlerPreisCents: 3990, copayCents: 500, lieferzeitTage: 2 },
  },
  {
    id: PRODUKT_IDS.bremsset, kategorieSlug: 'mobil-zubehoer', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Ersatz-Bremsset Leichtgewicht-Rollator (Platzhalter)', hilfsmittelnummer: null,
    kurzbeschreibung: 'Neue Bremsen für den Leichtgewicht-Rollator.',
    beschreibung: 'Bremszüge und Bremsklötze, passend nur für die Ausführung mit 54 cm Sitzhöhe.', artikelnummer: 'MT-BS-54',
    merkmale: ['Bremszüge', 'Bremsklötze'], requiresApproval: false, angebot: { copayCents: 1490, lieferzeitTage: 5 },
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
    id: produkt(25), kategorieSlug: 'atemtherapie', herstellerId: MANUFACTURER_IDS.mobiltech,
    name: 'Inhalationsgerät (Platzhalter)', hilfsmittelnummer: himi(73),
    kurzbeschreibung: 'Verneblung von Medikamenten zum Einatmen.',
    beschreibung: 'Kompressor-Inhalationsgerät mit Mundstück und Maske.', artikelnummer: 'MT-IH-01',
    merkmale: ['Mit Maske'], requiresApproval: false, angebot: { selbstzahlerPreisCents: 7990, copayCents: 1000, lieferzeitTage: 3 },
  },
  {
    id: produkt(27), kategorieSlug: 'inkontinenzartikel', herstellerId: MANUFACTURER_IDS.hausfit,
    name: 'Inkontinenz-Einlagen (Platzhalter)', hilfsmittelnummer: himi(81),
    kurzbeschreibung: 'Diskreter Schutz für den Alltag.',
    beschreibung: 'Atmungsaktive Einlagen, Monatsbedarf.', artikelnummer: 'HF-IE-M',
    merkmale: ['Monatsbedarf', 'Atmungsaktiv'], requiresApproval: false, angebot: { selbstzahlerPreisCents: 2490, copayCents: 1000, lieferzeitTage: 3 },
  },
  {
    id: produkt(37), kategorieSlug: 'therapiegeraete', herstellerId: MANUFACTURER_IDS.aktivcare,
    name: 'Motorbewegungsschiene Knie (Platzhalter)', hilfsmittelnummer: himi(91),
    kurzbeschreibung: 'Bewegt das Knie nach einer Operation passiv.',
    beschreibung: 'Leihgerät zur passiven Bewegung des Kniegelenks.', artikelnummer: 'AC-MS-K',
    merkmale: ['Leihgerät'], requiresApproval: true, angebot: { selbstzahlerPreisCents: 89900, copayCents: 1000, lieferzeitTage: 3 },
  },
];

export const ENTWICKLUNG_VARIANTEN = [
  { id: '50000000-0000-0000-0000-000000000001', productId: PRODUKT_IDS.rollatorLeicht, sku: 'MT-RL-ALU-54', attribute: { sitzhoeheCm: 54, label: 'Sitzhöhe 54 cm' } },
  { id: '50000000-0000-0000-0000-000000000002', productId: PRODUKT_IDS.rollatorLeicht, sku: 'MT-RL-ALU-62', attribute: { sitzhoeheCm: 62, label: 'Sitzhöhe 62 cm' } },
];

export const ENTWICKLUNG_BEZIEHUNGEN: {
  sourceProductId: string;
  targetProductId: string;
  relationType: 'zubehoer' | 'ersatzteil' | 'dienstleistung';
  sourceVariantId: string | null;
}[] = [
  { sourceProductId: PRODUKT_IDS.rollatorLeicht, targetProductId: KATALOG_IDS.rollatorTasche, relationType: 'zubehoer', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollatorLeicht, targetProductId: KATALOG_IDS.stockhalter, relationType: 'zubehoer', sourceVariantId: null },
  // Passt nur zur 54-cm-Ausführung — erscheint bei 62 cm nicht.
  { sourceProductId: PRODUKT_IDS.rollatorLeicht, targetProductId: PRODUKT_IDS.bremsset, relationType: 'ersatzteil', sourceVariantId: ENTWICKLUNG_VARIANTEN[0].id },
  { sourceProductId: PRODUKT_IDS.rollatorLeicht, targetProductId: KATALOG_IDS.einweisung, relationType: 'dienstleistung', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollatorOutdoor, targetProductId: KATALOG_IDS.rollatorTasche, relationType: 'zubehoer', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollatorOutdoor, targetProductId: KATALOG_IDS.einweisung, relationType: 'dienstleistung', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollstuhlAktiv, targetProductId: KATALOG_IDS.sitzkissen, relationType: 'zubehoer', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollstuhlAktiv, targetProductId: KATALOG_IDS.wartung, relationType: 'dienstleistung', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollstuhlKomfort, targetProductId: KATALOG_IDS.sitzkissen, relationType: 'zubehoer', sourceVariantId: null },
  { sourceProductId: PRODUKT_IDS.rollstuhlKomfort, targetProductId: KATALOG_IDS.wartung, relationType: 'dienstleistung', sourceVariantId: null },
];
