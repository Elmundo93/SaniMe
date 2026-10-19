import { normalisiere } from './katalogSuche';

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
// Jede id muss auf mindestens eine geseedete Kategorie zeigen — erzwungen vom
// Invarianten-Test catalog.seed-data.spec.ts. Hörhilfen wurden deshalb entfernt:
// Hörgeräte versorgt der Hörakustiker, nicht das Sanitätshaus — ein Eintrag ohne
// mögliche Produkte wäre eine Sackgasse. Altdaten mit `hoerhilfen` liefern über
// findeKrankheitsbild() einfach `undefined`.
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
    id: 'sehhilfen',
    bezeichnung: 'Sehhilfen',
    synonyme: ['sehen', 'auge', 'lupe', 'vergrößerung', 'sehschwäche'],
    icon: 'eye',
  },
];

export function findeKrankheitsbild(id: string): Krankheitsbild | undefined {
  return KRANKHEITSBILD_KATALOG.find((k) => k.id === id);
}

// Rein lokaler Stichwort-Abgleich (Einzeltreffer) — die Katalog-Discovery
// nutzt findeHilfe() aus katalogSuche.ts, das Bedarfe und Krankheitsbilder
// gemeinsam rankt. Bewusst kein Cloud-NLP/LLM: nur die bestätigte id verlässt
// das Gerät, nie der Transkript-Text selbst. In der Domain (nicht app-only) gehalten, damit der Abgleich nicht
// von der Taxonomie abweichen kann, die er selbst durchsucht.
// Beide Seiten über normalisiere() — „Strümpfe“, „struempfe“ und „STRÜMPFE“
// treffen dasselbe Synonym.
export function matcheKrankheitsbild(transcript: string): Krankheitsbild | null {
  const text = normalisiere(transcript);
  for (const kb of KRANKHEITSBILD_KATALOG) {
    if (kb.synonyme.some((synonym) => text.includes(normalisiere(synonym)))) {
      return kb;
    }
  }
  return null;
}
