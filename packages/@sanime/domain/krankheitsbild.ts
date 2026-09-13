export interface Krankheitsbild {
  id: string;
  bezeichnung: string;
  // Für die textbasierte Suche/Filterung (Phase 2) und später den lokalen
  // Sprach-Abgleich (Phase 3) — nie an das Backend geschickt, nur zur
  // Auflösung auf eine `id` genutzt.
  synonyme: string[];
  icon: string;
}

// Platzhalter-Taxonomie für den Entwicklungsstand, analog zur Katalog-Seed-
// Disziplin (CLAUDE.md: keine echten Produktionsdaten vortäuschen). Sowohl
// App als auch Backend importieren dieselbe Liste über ihre id — das Backend
// verknüpft eine Kategorie über catalogCategories.krankheitsbildId mit einer
// dieser ids (siehe apps/backend/src/modules/catalog/categories.repository.ts).
export const KRANKHEITSBILD_KATALOG: Krankheitsbild[] = [
  {
    id: 'mobilitaet',
    bezeichnung: 'Mobilität & Gehen',
    synonyme: ['gehen', 'laufen', 'rollstuhl', 'gehhilfe', 'sturz', 'gleichgewicht', 'treppen', 'rollator'],
    icon: 'activity',
  },
  {
    id: 'inkontinenz',
    bezeichnung: 'Inkontinenz',
    synonyme: ['inkontinenz', 'blase', 'windeln', 'harndrang', 'toilette'],
    icon: 'droplet',
  },
  {
    id: 'wundversorgung',
    bezeichnung: 'Wundversorgung',
    synonyme: ['wunde', 'verband', 'pflaster', 'dekubitus', 'wundliegen'],
    icon: 'plus-square',
  },
  {
    id: 'atemhilfen',
    bezeichnung: 'Atemhilfen',
    synonyme: ['atmen', 'atemnot', 'sauerstoff', 'husten', 'lunge'],
    icon: 'wind',
  },
  {
    id: 'kompression',
    bezeichnung: 'Kompression',
    synonyme: ['kompression', 'strümpfe', 'venen', 'schwellung', 'ödem', 'thrombose'],
    icon: 'circle',
  },
  {
    id: 'pflegebett',
    bezeichnung: 'Pflegebett & Lagerung',
    synonyme: ['bett', 'lagerung', 'liegen', 'matratze', 'pflegebett'],
    icon: 'moon',
  },
  {
    id: 'hoerhilfen',
    bezeichnung: 'Hörhilfen',
    synonyme: ['hören', 'ohr', 'schwerhörig', 'hörgerät'],
    icon: 'volume-2',
  },
  {
    id: 'sehhilfen',
    bezeichnung: 'Sehhilfen',
    synonyme: ['sehen', 'auge', 'lupe', 'vergrößerung'],
    icon: 'eye',
  },
];

export function findeKrankheitsbild(id: string): Krankheitsbild | undefined {
  return KRANKHEITSBILD_KATALOG.find((k) => k.id === id);
}

// Rein lokaler Stichwort-Abgleich für die on-device Sprach-Eingabe (Phase 3,
// lib/voice/krankheitsbildSpracherkennung.ts) — bewusst kein Cloud-NLP/LLM:
// nur die aufgelöste id verlässt später das Gerät, nie der Transkript-Text
// selbst. In der Domain (nicht app-only) gehalten, damit der Abgleich nicht
// von der Taxonomie abweichen kann, die er selbst durchsucht.
export function matcheKrankheitsbild(transcript: string): Krankheitsbild | null {
  const text = transcript.toLowerCase();
  for (const kb of KRANKHEITSBILD_KATALOG) {
    if (kb.synonyme.some((synonym) => text.includes(synonym))) {
      return kb;
    }
  }
  return null;
}
