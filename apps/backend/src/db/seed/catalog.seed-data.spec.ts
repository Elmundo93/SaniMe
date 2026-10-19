import { BEDARF_KATALOG, KATALOG_FILTER, KRANKHEITSBILD_KATALOG, findeBedarf, findeKrankheitsbild } from '@sanime/domain';
import { BEZIEHUNGEN, KATEGORIEN, PRODUKTE, VARIANTEN } from './catalog.seed-data';
import { QA_EINTRAEGE } from './qa.seed-data';

// Invarianten zwischen statischer Domain-Taxonomie (@sanime/domain) und den
// geseedeten Katalogdaten: eine leere Empfehlung soll ein Testfehler sein, kein
// Laufzeitzustand. Reine Datenprüfung, kein DB-Zugriff.

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
  it('has unique ids and slugs', () => {
    expect(new Set(KATEGORIEN.map((k) => k.id)).size).toBe(KATEGORIEN.length);
    expect(new Set(KATEGORIEN.map((k) => k.slug)).size).toBe(KATEGORIEN.length);
    expect(new Set(PRODUKTE.map((p) => p.id)).size).toBe(PRODUKTE.length);
  });

  it('has seven active main categories and at most two levels', () => {
    const haupt = aktiv.filter((k) => k.parentSlug === null);
    expect(haupt).toHaveLength(7);
    for (const k of aktiv.filter((k) => k.parentSlug !== null)) {
      expect(bySlug.get(k.parentSlug!)?.parentSlug).toBeNull();
    }
  });

  it('hangs every product on an active subcategory', () => {
    for (const p of PRODUKTE) {
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
    const ids = new Set(PRODUKTE.map((p) => p.id));
    const variantenIds = new Set(VARIANTEN.map((v) => v.id));
    for (const v of VARIANTEN) expect(ids.has(v.productId)).toBe(true);
    for (const b of BEZIEHUNGEN) {
      expect(ids.has(b.sourceProductId)).toBe(true);
      expect(ids.has(b.targetProductId)).toBe(true);
      if (b.sourceVariantId) expect(variantenIds.has(b.sourceVariantId)).toBe(true);
    }
  });

  it('gives every Kassenartikel a self-pay price above its Zuzahlung (Kauf ohne Rezept)', () => {
    for (const p of PRODUKTE.filter((x) => x.hilfsmittelnummer)) {
      expect({ name: p.name, preis: (p.angebot.selbstzahlerPreisCents ?? 0) > p.angebot.copayCents }).toEqual({ name: p.name, preis: true });
    }
    for (const p of PRODUKTE.filter((x) => !x.hilfsmittelnummer)) expect(p.angebot.selbstzahlerPreisCents).toBeUndefined();
  });

  it('marks every product as a placeholder', () => {
    for (const p of PRODUKTE) {
      expect(p.name).toMatch(/\(Platzhalter\)$/);
      if (p.hilfsmittelnummer) expect(p.hilfsmittelnummer).toMatch(/^00\.00\.00\./);
    }
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

  it('only links to existing targets', () => {
    const produktIds = new Set(PRODUKTE.map((p) => p.id));
    for (const l of QA_EINTRAEGE.flatMap((e) => e.links)) {
      if (l.productId) expect(produktIds.has(l.productId)).toBe(true);
      if (l.categorySlug) expect(bySlug.has(l.categorySlug)).toBe(true);
      if (l.bedarfId) expect(findeBedarf(l.bedarfId)).toBeDefined();
      if (l.krankheitsbildId) expect(findeKrankheitsbild(l.krankheitsbildId)).toBeDefined();
    }
  });
});
