import { BEDARF_KATALOG, type KatalogKategorie, type PassendeProdukte, type Produkt, type ProduktDetail } from '@sanime/domain';
import type { Versorgung } from '../types';

// Personalisierter Katalog: was zu den Versorgungen des Kunden passt — während
// er auf die Genehmigung wartet. Berechnet auf dem Gerät aus Daten, die die App
// ohnehin hat (eigene Versorgungen + öffentlicher Katalog); keine neue
// Verarbeitung von Gesundheitsdaten auf dem Server, nichts davon in Analytics.
// Nur Fakten (passendes Zubehör, Bereiche desselben Alltagsbedarfs), keine
// Behauptung medizinischer Eignung.

const MAX_PRODUKTE = 4;
const MAX_KATEGORIEN = 3;

export interface ProduktVorschlag {
  produkt: Produkt;
  // „Passt zu deinem …“ — die Versorgung, an der der Vorschlag hängt.
  zu: string;
}

export interface KategorieVorschlag {
  kategorie: KatalogKategorie;
  // Titel des Alltagsbedarfs, über den die Kategorie gefunden wurde.
  bedarf: string;
}

export interface PersonalisierterKatalog {
  produkte: ProduktVorschlag[];
  kategorien: KategorieVorschlag[];
}

// Laufende zuerst — dort ist die Wartezeit; abgeschlossene dürfen trotzdem
// Zubehör liefern (Ersatz, Ergänzung).
export function quellVersorgungen(versorgungen: Versorgung[]): Versorgung[] {
  const laufend = (v: Versorgung) => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(v.status);
  const sortiert = [...versorgungen].sort((a, b) => Number(laufend(b)) - Number(laufend(a)));
  const gesehen = new Set<string>();
  return sortiert.filter((v) => v.produktId && !gesehen.has(v.produktId) && gesehen.add(v.produktId));
}

export function baueVorschlaege(
  versorgungen: Versorgung[],
  details: Map<string, ProduktDetail>,
  passend: Map<string, PassendeProdukte>,
  kategorien: KatalogKategorie[],
): PersonalisierterKatalog {
  const quellen = quellVersorgungen(versorgungen);
  const bestellt = new Set(quellen.map((v) => v.produktId));

  const produkte: ProduktVorschlag[] = [];
  const gezeigt = new Set<string>();
  for (const v of quellen) {
    const p = passend.get(v.produktId);
    if (!p) continue;
    for (const produkt of [...(p.zubehoer ?? []), ...(p.dienstleistung ?? [])]) {
      if (bestellt.has(produkt.id) || gezeigt.has(produkt.id)) continue;
      gezeigt.add(produkt.id);
      produkte.push({ produkt, zu: v.produkt });
    }
  }

  const eigeneSlugs = new Set(
    quellen.map((v) => details.get(v.produktId)?.kategorieSlug).filter((s): s is string => !!s),
  );
  const kategorieVorschlaege: KategorieVorschlag[] = [];
  const genommen = new Set<string>();
  for (const bedarf of BEDARF_KATALOG) {
    if (!bedarf.kategorieSlugs.some((s) => eigeneSlugs.has(s))) continue;
    for (const slug of bedarf.kategorieSlugs) {
      if (eigeneSlugs.has(slug) || genommen.has(slug)) continue;
      const kategorie = kategorien.find((k) => k.slug === slug);
      if (!kategorie) continue;
      genommen.add(slug);
      kategorieVorschlaege.push({ kategorie, bedarf: bedarf.titel });
    }
  }

  return { produkte: produkte.slice(0, MAX_PRODUKTE), kategorien: kategorieVorschlaege.slice(0, MAX_KATEGORIEN) };
}
