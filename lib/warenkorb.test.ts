import type { Produkt, WarenkorbPosition } from '@sanime/domain';
import { gleicheProdukte, warenkorbAbgleich } from './warenkorb';

const produkt = (id: string): Produkt => ({
  id,
  name: id,
  hersteller: 'x',
  beschreibung: 'x',
  eigenanteil: 0,
  lieferzeit: 'x',
  kategorie: 'x',
  merkmale: [],
});

const position = (id: string, mitRezept = false): WarenkorbPosition => ({
  produkt: produkt(id),
  rezept: mitRezept
    ? {
        patient: { name: 'P', dateOfBirth: '' },
        arzt: { name: 'A' },
        krankenkasse: { name: 'K', versichertenNr: 'V' },
        diagnose: 'D',
        hilfsmittel: 'H',
        datum: '',
      }
    : null,
  rezeptConfidence: null,
  ohneRezept: false,
  krankheitsbildId: null,
  variante: null,
});

describe('warenkorbAbgleich', () => {
  it('nimmt bei leerem lokalen Warenkorb den Stand des Servers', () => {
    expect(warenkorbAbgleich([], [position('a'), position('b')])).toEqual([{ produktId: 'a' }, { produktId: 'b' }]);
  });

  it('lässt den lokalen Warenkorb führen, Positionen ohne Rezept dürfen wegfallen', () => {
    expect(warenkorbAbgleich([{ produktId: 'c' }], [position('a')])).toEqual([{ produktId: 'c' }]);
  });

  it('behält Positionen mit erfasstem Rezept', () => {
    expect(warenkorbAbgleich([{ produktId: 'c' }], [position('a', true)])).toEqual([{ produktId: 'c' }, { produktId: 'a' }]);
  });
});

describe('Größe/Ausführung', () => {
  it('übernimmt die Größe einer Position und erkennt eine geänderte Größe', () => {
    const mitGroesse = { ...position('a'), variante: { id: 'v-m', bezeichnung: 'Größe M' } };
    expect(warenkorbAbgleich([], [mitGroesse])).toEqual([{ produktId: 'a', varianteId: 'v-m' }]);
    expect(gleicheProdukte([{ produktId: 'a', varianteId: 'v-m' }], [{ produktId: 'a', varianteId: 'v-l' }])).toBe(false);
    expect(gleicheProdukte([{ produktId: 'a', varianteId: 'v-m' }], [{ produktId: 'a', varianteId: 'v-m' }])).toBe(true);
  });
});

describe('gleicheProdukte', () => {
  it('vergleicht Produkte und Reihenfolge', () => {
    expect(gleicheProdukte([{ produktId: 'a' }], [{ produktId: 'a' }])).toBe(true);
    expect(gleicheProdukte([{ produktId: 'a' }, { produktId: 'b' }], [{ produktId: 'b' }, { produktId: 'a' }])).toBe(false);
  });
});
