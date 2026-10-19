// Kontextabhängige Katalogfilter — statisch, keyed by Unterkategorie-Slug, mit
// Alltagssprach-Labels („Gewicht des Rollators“ statt „Eigengewicht“). Die App
// rendert daraus die Filter-Chips, das Backend validiert GET /products?filter[…]
// gegen dieselbe Definition (unbekannter Schlüssel/Wert → 400) und filtert gegen
// products.attributes (jsonb). Ein Filter = eine Definition hier, nicht zwei.

export type KatalogFilterTyp = 'bool' | 'bereich' | 'auswahl';

export interface KatalogFilterOption {
  wert: string;
  label: string;
}

export interface KatalogFilterDefinition {
  /** Attribut-Schlüssel in products.attributes; `preisEuro` ist der Sonderfall Angebotspreis. */
  schluessel: string;
  label: string;
  typ: KatalogFilterTyp;
  /** bool: Label des aktiven Chips, z. B. „Zusammenklappbar“. */
  chipLabel?: string;
  /** auswahl: feste Optionen. Das Attribut darf mehrere Werte kommagetrennt
   * tragen („innen,aussen“) — der Filter trifft, wenn einer davon passt. */
  optionen?: KatalogFilterOption[];
  /** bereich: Stufen als Chips („bis 8 kg“). `max` = Attribut ≤ Wert, `min` = Attribut ≥ Wert. */
  stufen?: number[];
  richtung?: 'max' | 'min';
  einheit?: string;
}

/** Sonderschlüssel: filtert über den Angebotspreis (supplier_products), nicht über attributes. */
export const PREIS_FILTER_SCHLUESSEL = 'preisEuro';

const PREIS: KatalogFilterDefinition = {
  schluessel: PREIS_FILTER_SCHLUESSEL,
  label: 'Eigenanteil bis',
  typ: 'bereich',
  stufen: [25, 50, 100, 250],
  richtung: 'max',
  einheit: '€',
};

const BELASTBARKEIT = (stufen: number[]): KatalogFilterDefinition => ({
  schluessel: 'belastbarkeitKg',
  label: 'Bis zu welchem Körpergewicht',
  typ: 'bereich',
  stufen,
  richtung: 'min',
  einheit: 'kg',
});

export const KATALOG_FILTER: Record<string, KatalogFilterDefinition[]> = {
  rollatoren: [
    {
      schluessel: 'einsatzort',
      label: 'Wo nutzt du ihn?',
      typ: 'auswahl',
      optionen: [
        { wert: 'innen', label: 'Drinnen' },
        { wert: 'aussen', label: 'Draußen' },
      ],
    },
    { schluessel: 'gewichtKg', label: 'Gewicht des Rollators', typ: 'bereich', stufen: [6, 7, 8, 9], richtung: 'max', einheit: 'kg' },
    BELASTBARKEIT([120, 130, 150]),
    { schluessel: 'faltbar', label: 'Zusammenklappbar', typ: 'bool', chipLabel: 'Zusammenklappbar' },
    PREIS,
  ],
  rollstuehle: [
    { schluessel: 'faltbar', label: 'Zusammenklappbar', typ: 'bool', chipLabel: 'Zusammenklappbar' },
    { schluessel: 'gewichtKg', label: 'Gewicht des Rollstuhls', typ: 'bereich', stufen: [13, 15, 18], richtung: 'max', einheit: 'kg' },
    BELASTBARKEIT([110, 130]),
  ],
  duschhilfen: [
    { schluessel: 'rueckenlehne', label: 'Mit Rückenlehne', typ: 'bool', chipLabel: 'Mit Rückenlehne' },
    { schluessel: 'hoehenverstellbar', label: 'Höhe einstellbar', typ: 'bool', chipLabel: 'Höhe einstellbar' },
    BELASTBARKEIT([110, 130]),
  ],
  gehhilfen: [
    { schluessel: 'hoehenverstellbar', label: 'Höhe einstellbar', typ: 'bool', chipLabel: 'Höhe einstellbar' },
    PREIS,
  ],
};

export function filterFuerKategorie(slug: string | null | undefined): KatalogFilterDefinition[] {
  return slug ? KATALOG_FILTER[slug] ?? [] : [];
}

export type GepruefterFilter =
  | { schluessel: string; typ: 'bool' }
  | { schluessel: string; typ: 'auswahl'; wert: string }
  | { schluessel: string; typ: 'bereich'; wert: number; richtung: 'max' | 'min' };

export type FilterPruefung = { ok: true; filter: GepruefterFilter[] } | { ok: false; fehler: string };

/** Prüft rohe Filterwerte (Query-Params / Router-Params) gegen die Definition der
 * Kategorie. Unbekannte Schlüssel oder Werte sind ein Fehler, kein stilles Ignorieren —
 * sonst zeigt die App „gefiltert“ an, obwohl der Server ungefiltert liefert. */
export function pruefeFilter(slug: string | null | undefined, roh: Record<string, string>): FilterPruefung {
  const definitionen = filterFuerKategorie(slug);
  const filter: GepruefterFilter[] = [];
  for (const [schluessel, wert] of Object.entries(roh)) {
    const def = definitionen.find((d) => d.schluessel === schluessel);
    if (!def) return { ok: false, fehler: `Unbekannter Filter: ${schluessel}` };
    if (def.typ === 'bool') {
      if (wert !== 'true') return { ok: false, fehler: `Ungültiger Wert für ${schluessel}` };
      filter.push({ schluessel, typ: 'bool' });
    } else if (def.typ === 'auswahl') {
      if (!def.optionen?.some((o) => o.wert === wert)) return { ok: false, fehler: `Ungültiger Wert für ${schluessel}` };
      filter.push({ schluessel, typ: 'auswahl', wert });
    } else {
      const zahl = Number(wert);
      if (!Number.isFinite(zahl)) return { ok: false, fehler: `Ungültiger Wert für ${schluessel}` };
      filter.push({ schluessel, typ: 'bereich', wert: zahl, richtung: def.richtung ?? 'max' });
    }
  }
  return { ok: true, filter };
}

/** Anzeigetext eines aktiven Filters, z. B. „bis 8 kg“ oder „Draußen“. */
export function filterChipLabel(def: KatalogFilterDefinition, wert: string): string {
  if (def.typ === 'bool') return def.chipLabel ?? def.label;
  if (def.typ === 'auswahl') return def.optionen?.find((o) => o.wert === wert)?.label ?? wert;
  const praefix = def.richtung === 'min' ? 'mind.' : 'bis';
  return `${praefix} ${wert} ${def.einheit ?? ''}`.trim();
}
