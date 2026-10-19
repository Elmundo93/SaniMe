import {
  erweitereSuchbegriffe,
  findeBedarfe,
  findeHilfe,
  normalisiere,
  schlageVor,
  schreibvorschlag,
  suchwoerter,
} from './katalogSuche';
import { BEDARF_KATALOG, findeBedarf } from './bedarf';
import { KATALOG_FILTER, filterChipLabel, pruefeFilter } from './katalogFilter';

describe('normalisiere', () => {
  it('lowercases, spells out umlauts and strips punctuation', () => {
    expect(normalisiere('  Größe: Rollstühle!  ')).toBe('groesse rollstuehle');
  });

  it('drops filler words in suchwoerter', () => {
    expect(suchwoerter('Ich suche etwas, das mir beim Aufstehen hilft.')).toEqual(['aufstehen']);
  });
});

describe('erweitereSuchbegriffe', () => {
  it('expands a variant to its canonical term and siblings', () => {
    const begriffe = erweitereSuchbegriffe('Gehwagen');
    expect(begriffe).toContain('gehwagen');
    expect(begriffe).toContain('rollator');
    expect(begriffe).toContain('laufhilfe');
  });

  it('expands multi-word variants', () => {
    expect(erweitereSuchbegriffe('WC-Aufsatz für zuhause')).toContain('toilettensitzerhoehung');
  });

  it('keeps unknown words as they are', () => {
    expect(erweitereSuchbegriffe('Fantasieprodukt')).toEqual(['fantasieprodukt']);
  });
});

describe('schreibvorschlag', () => {
  it('corrects a typo to the nearest known term', () => {
    expect(schreibvorschlag('Rolattor')).toBe('rollator');
  });

  it('maps a corrected variant to its canonical term', () => {
    expect(schreibvorschlag('Dushhocker')).toBe('duschstuhl');
  });

  it('returns null when nothing needs correcting', () => {
    expect(schreibvorschlag('Rollator')).toBeNull();
    expect(schreibvorschlag('xyz')).toBeNull();
  });
});

describe('findeBedarfe / findeHilfe', () => {
  it('ranks Bedarfe by keyword hits', () => {
    expect(findeBedarfe('Ich kann beim Duschen nicht lange stehen und rutsche in der Badewanne aus')[0].id).toBe('duschen');
  });

  it('returns Bedarfe before Krankheitsbilder', () => {
    const treffer = findeHilfe('Ich bin beim Gehen unsicher');
    expect(treffer[0]).toMatchObject({ typ: 'bedarf', id: 'gehen' });
    expect(treffer.some((t) => t.typ === 'krankheitsbild' && t.id === 'mobilitaet')).toBe(true);
  });

  it('returns nothing for an empty or unrelated text', () => {
    expect(findeHilfe('')).toEqual([]);
    expect(findeHilfe('Ich hätte gerne einen Kaffee')).toEqual([]);
  });

  it('matches every Bedarf by its own example sentence', () => {
    for (const bedarf of BEDARF_KATALOG) {
      expect(findeBedarfe(bedarf.beispielsatz).map((b) => b.id)).toContain(bedarf.id);
    }
  });
});

describe('schlageVor', () => {
  const kategorien = [{ id: 'k1', name: 'Rollatoren' }];

  it('suggests categories, Bedarfe and terms by prefix', () => {
    const vorschlaege = schlageVor('roll', kategorien);
    expect(vorschlaege[0]).toEqual({ typ: 'kategorie', label: 'Rollatoren', wert: 'k1' });
    expect(vorschlaege.some((v) => v.typ === 'begriff' && v.wert === 'rollstuhl')).toBe(true);
  });

  it('needs at least two characters', () => {
    expect(schlageVor('r', kategorien)).toEqual([]);
  });
});

describe('BEDARF_KATALOG', () => {
  it('has unique ids and at least one category slug each', () => {
    const ids = BEDARF_KATALOG.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BEDARF_KATALOG) expect(b.kategorieSlugs.length).toBeGreaterThan(0);
    expect(findeBedarf('duschen')?.titel).toBe('Sicher duschen & baden');
    expect(findeBedarf('gibt-es-nicht')).toBeUndefined();
  });
});

describe('pruefeFilter', () => {
  it('accepts known filters and parses numbers', () => {
    const ergebnis = pruefeFilter('rollatoren', { faltbar: 'true', gewichtKg: '8', einsatzort: 'aussen' });
    expect(ergebnis).toEqual({
      ok: true,
      filter: [
        { schluessel: 'faltbar', typ: 'bool' },
        { schluessel: 'gewichtKg', typ: 'bereich', wert: 8, richtung: 'max' },
        { schluessel: 'einsatzort', typ: 'auswahl', wert: 'aussen' },
      ],
    });
  });

  it('rejects unknown keys and values instead of ignoring them', () => {
    expect(pruefeFilter('rollatoren', { farbe: 'rot' }).ok).toBe(false);
    expect(pruefeFilter('rollatoren', { einsatzort: 'mond' }).ok).toBe(false);
    expect(pruefeFilter('rollatoren', { gewichtKg: 'leicht' }).ok).toBe(false);
    expect(pruefeFilter(null, { faltbar: 'true' }).ok).toBe(false);
  });

  it('labels chips in everyday language', () => {
    const [einsatzort, gewicht, belastbarkeit] = KATALOG_FILTER.rollatoren;
    expect(filterChipLabel(einsatzort, 'aussen')).toBe('Draußen');
    expect(filterChipLabel(gewicht, '8')).toBe('bis 8 kg');
    expect(filterChipLabel(belastbarkeit, '130')).toBe('mind. 130 kg');
  });
});
