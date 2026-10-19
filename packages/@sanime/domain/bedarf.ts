// „Wobei brauchst du Hilfe?“ — Alltagssituationen statt Diagnosen. Gleiches Muster
// wie krankheitsbild.ts: statische Domain-Daten, von App und Backend identisch
// importiert, keine DB-Entität. Das Backend löst `kategorieSlugs` über
// catalog_categories.slug auf (GET /products?bedarfId=…); eine Hauptkategorie
// schließt ihre Unterkategorien ein. Der Invarianten-Test im Backend
// (catalog.seed-data.spec.ts) stellt sicher, dass jeder Slug auf eine geseedete,
// aktive Kategorie zeigt — eine leere Empfehlung ist ein Testfehler, kein
// Laufzeitzustand. Platzhalter-Inhalte (CLAUDE.md-Katalogregel).
//
// Bedarfe behaupten keine medizinische Eignung — sie beschreiben, *wobei*
// jemand Unterstützung sucht, und führen zu Produktgruppen, nicht zu Diagnosen.

export interface Bedarf {
  id: string;
  /** Kurzer Kartentitel, z. B. „Leichter aufstehen“. */
  titel: string;
  /** Beispielsatz für die Spracheingabe, z. B. „Ich suche etwas, das mir beim Aufstehen hilft.“ */
  beispielsatz: string;
  /** Für den on-device Abgleich von Text und Sprache — verlässt nie das Gerät. */
  stichworte: string[];
  /** Slugs von Kategorien (Haupt- oder Unterkategorie), nie UUIDs. */
  kategorieSlugs: string[];
  /** Feather-Icon-Name, wie Krankheitsbild.icon. */
  icon: string;
}

export const BEDARF_KATALOG: Bedarf[] = [
  {
    id: 'aufstehen',
    titel: 'Leichter aufstehen',
    beispielsatz: 'Ich suche etwas, das mir beim Aufstehen hilft.',
    stichworte: ['aufstehen', 'hochkommen', 'aufrichten', 'sessel', 'aus dem bett', 'hinsetzen'],
    kategorieSlugs: ['aufstehhilfen', 'transferhilfen'],
    icon: 'arrow-up-circle',
  },
  {
    id: 'gehen',
    titel: 'Sicher gehen',
    beispielsatz: 'Ich bin beim Gehen unsicher.',
    stichworte: ['gehen', 'laufen', 'spazieren', 'unsicher', 'stolpern', 'sturz', 'gleichgewicht', 'einkaufen'],
    kategorieSlugs: ['rollatoren', 'gehhilfen'],
    icon: 'navigation',
  },
  {
    id: 'unterwegs',
    titel: 'Längere Strecken schaffen',
    beispielsatz: 'Weite Wege schaffe ich nicht mehr allein.',
    stichworte: ['strecke', 'weite wege', 'ausflug', 'unterwegs', 'schieben', 'sitzen unterwegs'],
    kategorieSlugs: ['rollstuehle', 'rollatoren'],
    icon: 'map',
  },
  {
    id: 'stufen',
    titel: 'Stufen & Schwellen überwinden',
    beispielsatz: 'Ich komme über die Schwelle an der Tür nicht drüber.',
    stichworte: ['stufe', 'schwelle', 'treppe', 'kante', 'tuerschwelle', 'balkon'],
    kategorieSlugs: ['rampen'],
    icon: 'trending-up',
  },
  {
    id: 'duschen',
    titel: 'Sicher duschen & baden',
    beispielsatz: 'Ich kann beim Duschen nicht mehr lange stehen.',
    stichworte: ['duschen', 'dusche', 'baden', 'badewanne', 'wanne', 'waschen', 'ausrutschen'],
    kategorieSlugs: ['duschhilfen', 'badewannenhilfen'],
    icon: 'droplet',
  },
  {
    id: 'toilette',
    titel: 'Toilette leichter nutzen',
    beispielsatz: 'Die Toilette ist mir zu niedrig.',
    stichworte: ['toilette', 'klo', 'wc', 'zu niedrig', 'nachts'],
    kategorieSlugs: ['toilettenhilfen'],
    icon: 'home',
  },
  {
    id: 'anziehen',
    titel: 'Selbst anziehen',
    beispielsatz: 'Ich komme nicht mehr gut an meine Füße.',
    stichworte: ['anziehen', 'socken', 'struempfe', 'schuhe', 'knoepfe', 'buecken', 'fuesse'],
    kategorieSlugs: ['anziehhilfen'],
    icon: 'user',
  },
  {
    id: 'greifen',
    titel: 'Greifen & Halten',
    beispielsatz: 'Mir fallen Dinge oft aus der Hand.',
    stichworte: ['greifen', 'halten', 'aufheben', 'faellt', 'hand', 'besteck', 'essen', 'trinken'],
    kategorieSlugs: ['greifhilfen', 'esshilfen'],
    icon: 'thumbs-up',
  },
  {
    id: 'lesen',
    titel: 'Besser lesen',
    beispielsatz: 'Kleine Schrift kann ich kaum noch lesen.',
    stichworte: ['lesen', 'schrift', 'zeitung', 'kleingedrucktes', 'licht', 'sehen'],
    kategorieSlugs: ['lese-sehhilfen'],
    icon: 'book-open',
  },
  {
    id: 'liegen',
    titel: 'Besser liegen & schlafen',
    beispielsatz: 'Ich liege mich wund oder komme schlecht aus dem Bett.',
    stichworte: ['liegen', 'schlafen', 'bett', 'wundliegen', 'umlagern', 'matratze'],
    kategorieSlugs: ['pflegebetten', 'matratzen', 'lagerung'],
    icon: 'moon',
  },
  {
    id: 'pflegen',
    titel: 'Angehörige pflegen',
    beispielsatz: 'Ich pflege meinen Vater zu Hause.',
    stichworte: ['pflegen', 'pflege', 'angehoerige', 'umsetzen', 'heben', 'transfer'],
    kategorieSlugs: ['transferhilfen', 'pflegebetten', 'hygiene'],
    icon: 'heart',
  },
  {
    id: 'beweglich-bleiben',
    titel: 'In Bewegung bleiben',
    beispielsatz: 'Ich möchte zu Hause etwas für meine Beine tun.',
    stichworte: ['bewegung', 'training', 'trainieren', 'fit', 'muskeln', 'beine', 'reha'],
    kategorieSlugs: ['bewegung-training'],
    icon: 'activity',
  },
  {
    id: 'werte-messen',
    titel: 'Werte im Blick behalten',
    beispielsatz: 'Ich soll regelmäßig meinen Blutdruck messen.',
    stichworte: ['messen', 'blutdruck', 'puls', 'werte', 'blutzucker', 'fieber'],
    kategorieSlugs: ['messgeraete'],
    icon: 'bar-chart-2',
  },
];

export function findeBedarf(id: string): Bedarf | undefined {
  return BEDARF_KATALOG.find((b) => b.id === id);
}
