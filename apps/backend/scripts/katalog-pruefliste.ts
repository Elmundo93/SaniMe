// Exportiert den Katalog v1 als Prüfliste für den Einkauf (CSV, Semikolon,
// UTF-8 mit BOM — öffnet sich direkt in Excel/Numbers):
//
//   npm run backend:katalog-pruefliste > katalog-pruefliste.csv
//
// „MwSt. steuerlich bestätigt“ steht überall auf „nein“, bis Steuerberatung die
// Einstufung (19 % / 7 % nach Anlage 2 UStG) je Artikel bestätigt hat.
// Die Spalten „Bestätigter Preis“, „Lieferant“, „Lieferanten-Artikelnr.“ und
// „Anmerkung“ bleiben leer und werden vom Einkauf ausgefüllt. Liest nur die
// Seed-Daten, keine Datenbank — die Entwicklungs-Platzhalter sind nicht enthalten.
import { KATEGORIEN, PRODUKTE } from '../src/db/seed/catalog.seed-data';

const SPALTEN = [
  'Artikelnummer',
  'Bereich',
  'Kategorie',
  'Artikel',
  'Kurzbeschreibung',
  'Mindestanforderungen',
  'Richtpreis inkl. MwSt. (EUR)',
  'Lieferzeit (Werktage)',
  'MwSt. (%)',
  'MwSt. steuerlich bestätigt',
  'Bestätigter Preis (EUR)',
  'Lieferant',
  'Lieferanten-Artikelnr.',
  'Anmerkung',
];

function zelle(wert: string): string {
  return /[";\n]/.test(wert) ? `"${wert.replace(/"/g, '""')}"` : wert;
}

function euro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

const kategorie = new Map(KATEGORIEN.map((k) => [k.slug, k]));
const reihenfolge = new Map(KATEGORIEN.map((k, index) => [k.slug, index]));

const zeilen = [...PRODUKTE]
  .sort((a, b) => (reihenfolge.get(a.kategorieSlug) ?? 0) - (reihenfolge.get(b.kategorieSlug) ?? 0) || a.artikelnummer.localeCompare(b.artikelnummer))
  .map((p) => {
    const unter = kategorie.get(p.kategorieSlug);
    const haupt = unter?.parentSlug ? kategorie.get(unter.parentSlug) : undefined;
    return [
      p.artikelnummer,
      haupt?.name ?? '',
      unter?.name ?? p.kategorieSlug,
      p.name,
      p.kurzbeschreibung,
      p.merkmale.join(', '),
      euro(p.angebot.copayCents),
      String(p.angebot.lieferzeitTage),
      String(p.mwstSatz ?? 19),
      'nein',
      '',
      '',
      '',
      '',
    ];
  });

process.stdout.write('﻿' + [SPALTEN, ...zeilen].map((z) => z.map(zelle).join(';')).join('\r\n') + '\r\n');
