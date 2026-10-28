import type { Produkt } from '@sanime/domain';

// Anzeige-Texte für Katalogkarten und Detailseite — Progressive Disclosure:
// in Listen ein Kostenhinweis statt HiMi-Nummer, die steht nur im
// aufklappbaren Technik-Bereich der Detailseite.

export function formatEuro(betrag: number): string {
  return `${betrag.toFixed(2).replace('.', ',')} €`;
}

/** „Kostenübernahme möglich – mit Rezept“ für Kassenprodukte, sonst der Preis. */
export function kostenhinweis(produkt: Produkt): { titel: string; detail?: string } {
  if (produkt.hilfsmittelNr) {
    return {
      titel: 'Kostenübernahme durch die Krankenkasse möglich – mit Rezept',
      detail:
        [
          produkt.eigenanteil > 0 ? `Gesetzl. Zuzahlung bis ${formatEuro(produkt.eigenanteil)}` : null,
          produkt.selbstzahlerPreis !== undefined ? `Ohne Rezept: ${formatEuro(produkt.selbstzahlerPreis)} inkl. MwSt.` : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
    };
  }
  // Preisangabenverordnung: Endpreise für Verbraucher immer mit Hinweis auf die Umsatzsteuer.
  return produkt.eigenanteil > 0
    ? { titel: formatEuro(produkt.eigenanteil), detail: 'inkl. MwSt.' }
    : { titel: 'Kostenlos' };
}

export function istBestellbar(produkt: Produkt): boolean {
  return produkt.verfuegbar !== false;
}

export function verfuegbarkeitText(produkt: Produkt): string {
  return istBestellbar(produkt) ? `Lieferzeit: ${produkt.lieferzeit}` : 'Derzeit nicht bestellbar';
}

/** Zusammengefasstes Screenreader-Label einer Katalogkarte. */
export function produktA11yLabel(produkt: Produkt): string {
  const kosten = kostenhinweis(produkt);
  return [produkt.name, produkt.kurzbeschreibung, kosten.titel, verfuegbarkeitText(produkt)]
    .filter((teil): teil is string => !!teil)
    .map((teil) => teil.replace(/[.!?]$/, ''))
    .join('. ');
}

export function anzahlText(anzahl: number, einzahl: string, mehrzahl: string): string {
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`;
}
