import { BEDARF_KATALOG, KATALOG_FILTER, KRANKHEITSBILD_KATALOG, findeBedarf, findeKrankheitsbild } from '@sanime/domain';
import { BEZIEHUNGEN, KATEGORIEN, PRODUKTE, VARIANTEN } from './catalog.seed-data';
import {
  ENTWICKLUNG_BEZIEHUNGEN,
  ENTWICKLUNG_PRODUKTE,
  ENTWICKLUNG_VARIANTEN,
  mitEntwicklungskatalog,
} from './catalog.entwicklung.seed-data';
import { QA_EINTRAEGE } from './qa.seed-data';

// Invarianten zwischen statischer Domain-Taxonomie (@sanime/domain) und den
// geseedeten Katalogdaten: eine leere Empfehlung soll ein Testfehler sein, kein
// Laufzeitzustand. Reine Datenprüfung, kein DB-Zugriff. Die Abdeckung wird gegen
// den Produktionskatalog ALLEIN geprüft — die Entwicklungs-Platzhalter fehlen dort.

const aktiv = KATEGORIEN.filter((k) => k.isActive !== false);
const bySlug = new Map(aktiv.map((k) => [k.slug, k]));

/** Slug plus — bei einer Hauptkategorie — ihre Unterkategorien. */
function mitKindern(slug: string): string[] {
  return [slug, ...aktiv.filter((k) => k.parentSlug === slug).map((k) => k.slug)];
}

function produkteIn(slugs: string[]) {
  return PRODUKTE.filter((p) => slugs.includes(p.kategorieSlug) && p.angebot.availability !== 'unavailable');
}

describe('catalog seed data', () => {
  it('has unique ids, slugs and article numbers, also together with the development data', () => {
    expect(new Set(KATEGORIEN.map((k) => k.id)).size).toBe(KATEGORIEN.length);
    expect(new Set(KATEGORIEN.map((k) => k.slug)).size).toBe(KATEGORIEN.length);
    const alle = [...PRODUKTE, ...ENTWICKLUNG_PRODUKTE];
    expect(new Set(alle.map((p) => p.id)).size).toBe(alle.length);
    expect(new Set(alle.map((p) => p.artikelnummer)).size).toBe(alle.length);
  });

  it('has seven active main categories and at most two levels', () => {
    const haupt = aktiv.filter((k) => k.parentSlug === null);
    expect(haupt).toHaveLength(7);
    for (const k of aktiv.filter((k) => k.parentSlug !== null)) {
      expect(bySlug.get(k.parentSlug!)?.parentSlug).toBeNull();
    }
  });

  it('hangs every product on an active subcategory', () => {
    for (const p of [...PRODUKTE, ...ENTWICKLUNG_PRODUKTE]) {
      const kategorie = bySlug.get(p.kategorieSlug);
      expect(kategorie).toBeDefined();
      expect(kategorie!.parentSlug).not.toBeNull();
    }
  });

  it('gives every active subcategory at least one orderable product', () => {
    for (const k of aktiv.filter((k) => k.parentSlug !== null)) {
      expect(produkteIn([k.slug]).length).toBeGreaterThan(0);
    }
  });

  it.each(KRANKHEITSBILD_KATALOG.map((kb) => [kb.id]))('resolves Krankheitsbild %s to products', (id) => {
    const getaggt = aktiv.filter((k) => k.krankheitsbildId === id);
    expect(getaggt.length).toBeGreaterThan(0);
    expect(produkteIn(getaggt.flatMap((k) => mitKindern(k.slug))).length).toBeGreaterThan(0);
  });

  it('only tags known Krankheitsbild ids', () => {
    for (const k of KATEGORIEN.filter((k) => k.krankheitsbildId)) {
      expect(findeKrankheitsbild(k.krankheitsbildId!)).toBeDefined();
    }
  });

  it.each(BEDARF_KATALOG.map((b) => [b.id]))('resolves Bedarf %s to products', (id) => {
    const bedarf = findeBedarf(id)!;
    for (const slug of bedarf.kategorieSlugs) expect(bySlug.has(slug)).toBe(true);
    expect(produkteIn(bedarf.kategorieSlugs.flatMap(mitKindern)).length).toBeGreaterThan(0);
  });

  it('defines filters only for existing subcategories, with matching product attributes', () => {
    for (const [slug, definitionen] of Object.entries(KATALOG_FILTER)) {
      expect(bySlug.get(slug)?.parentSlug).not.toBeNull();
      const produkte = produkteIn([slug]);
      for (const def of definitionen.filter((d) => d.schluessel !== 'preisEuro')) {
        // Mindestens ein Produkt trägt das Attribut — sonst wäre der Filter immer leer.
        expect({ slug, schluessel: def.schluessel, vorhanden: produkte.some((p) => p.attribute?.[def.schluessel] !== undefined) }).toEqual({
          slug,
          schluessel: def.schluessel,
          vorhanden: true,
        });
      }
    }
  });

  it('links relations and variants to seeded products', () => {
    // Produktion: nur echte Artikel. Entwicklung darf zusätzlich auf echte Artikel zeigen.
    const ids = new Set(PRODUKTE.map((p) => p.id));
    for (const b of BEZIEHUNGEN) {
      expect(ids.has(b.sourceProductId)).toBe(true);
      expect(ids.has(b.targetProductId)).toBe(true);
      expect(b.sourceProductId).not.toBe(b.targetProductId);
    }
    for (const v of VARIANTEN) expect(ids.has(v.productId)).toBe(true);

    const alleIds = new Set([...PRODUKTE, ...ENTWICKLUNG_PRODUKTE].map((p) => p.id));
    const variantenIds = new Set([...VARIANTEN, ...ENTWICKLUNG_VARIANTEN].map((v) => v.id));
    for (const v of ENTWICKLUNG_VARIANTEN) expect(alleIds.has(v.productId)).toBe(true);
    for (const b of ENTWICKLUNG_BEZIEHUNGEN) {
      expect(alleIds.has(b.sourceProductId)).toBe(true);
      expect(alleIds.has(b.targetProductId)).toBe(true);
      if (b.sourceVariantId) expect(variantenIds.has(b.sourceVariantId)).toBe(true);
    }
  });

  it('gives every variant a label and a unique SKU', () => {
    const alle = [...VARIANTEN, ...ENTWICKLUNG_VARIANTEN];
    expect(new Set(alle.map((v) => v.id)).size).toBe(alle.length);
    expect(new Set(alle.map((v) => v.sku)).size).toBe(alle.length);
    for (const v of alle) expect(typeof v.attribute.label).toBe('string');
    // Ein Produkt mit Varianten bietet echte Auswahl, nicht nur eine.
    for (const id of new Set(alle.map((v) => v.productId))) expect(alle.filter((v) => v.productId === id).length).toBeGreaterThan(1);
  });

  it('gives every Kassenartikel a self-pay price above its Zuzahlung (Kauf ohne Rezept)', () => {
    const alle = [...PRODUKTE, ...ENTWICKLUNG_PRODUKTE];
    for (const p of alle.filter((x) => x.hilfsmittelnummer)) {
      expect({ name: p.name, preis: (p.angebot.selbstzahlerPreisCents ?? 0) > p.angebot.copayCents }).toEqual({ name: p.name, preis: true });
    }
    for (const p of alle.filter((x) => !x.hilfsmittelnummer)) expect(p.angebot.selbstzahlerPreisCents).toBeUndefined();
  });

  it('keeps the production catalog free of placeholders and Hilfsmittelnummern (v1: Selbstzahler only)', () => {
    for (const p of PRODUKTE) {
      expect({ name: p.name, platzhalter: /Platzhalter/i.test(p.name), himi: p.hilfsmittelnummer }).toEqual({
        name: p.name,
        platzhalter: false,
        himi: null,
      });
      expect(p.angebot.copayCents).toBeGreaterThan(0);
    }
  });

  it('uses only the two German VAT rates, 7 % only where Anlage 2 UStG clearly applies', () => {
    for (const p of [...PRODUKTE, ...ENTWICKLUNG_PRODUKTE]) expect([undefined, 7, 19]).toContain(p.mwstSatz);
    // Ermäßigt nur Rollstühle (Pos. 8713) und Krücken — Zubehör/Teile bleiben bei 19 %.
    const ermaessigt = PRODUKTE.filter((p) => p.mwstSatz === 7);
    expect(ermaessigt.every((p) => p.kategorieSlug === 'rollstuehle' || p.kategorieSlug === 'gehhilfen')).toBe(true);
    expect(PRODUKTE.filter((p) => p.kategorieSlug === 'rollstuehle').every((p) => p.mwstSatz === 7)).toBe(true);
  });

  it('marks every development product as a placeholder', () => {
    for (const p of ENTWICKLUNG_PRODUKTE) {
      expect(p.name).toMatch(/\(Platzhalter\)$/);
      if (p.hilfsmittelnummer) expect(p.hilfsmittelnummer).toMatch(/^00\.00\.00\./);
    }
  });

  it('never seeds the development data in production', () => {
    expect(mitEntwicklungskatalog({ NODE_ENV: 'production' })).toBe(false);
    expect(mitEntwicklungskatalog({ NODE_ENV: 'development', SEED_ENTWICKLUNGSKATALOG: 'aus' })).toBe(false);
    expect(mitEntwicklungskatalog({ NODE_ENV: 'test' })).toBe(true);
  });
});

describe('qa seed data', () => {
  it('has unique slugs, sources and exactly one target per link', () => {
    expect(new Set(QA_EINTRAEGE.map((e) => e.slug)).size).toBe(QA_EINTRAEGE.length);
    for (const e of QA_EINTRAEGE) {
      expect(e.quellen.length).toBeGreaterThan(0);
      expect(e.links.length).toBeGreaterThan(0);
      for (const l of e.links) {
        expect([l.productId, l.categorySlug, l.bedarfId, l.krankheitsbildId].filter(Boolean)).toHaveLength(1);
      }
    }
  });

  it('only links to existing targets (production products only)', () => {
    const produktIds = new Set(PRODUKTE.map((p) => p.id));
    for (const l of QA_EINTRAEGE.flatMap((e) => e.links)) {
      if (l.productId) expect(produktIds.has(l.productId)).toBe(true);
      if (l.categorySlug) expect(bySlug.has(l.categorySlug)).toBe(true);
      if (l.bedarfId) expect(findeBedarf(l.bedarfId)).toBeDefined();
      if (l.krankheitsbildId) expect(findeKrankheitsbild(l.krankheitsbildId)).toBeDefined();
    }
  });
});
