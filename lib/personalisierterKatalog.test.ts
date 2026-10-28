import type { KatalogKategorie, PassendeProdukte, Produkt, ProduktDetail } from '@sanime/domain';
import type { Versorgung } from '../types';
import { baueVorschlaege } from './personalisierterKatalog';

const produkt = (id: string, name: string): Produkt => ({
  id,
  name,
  hersteller: 'Beispiel',
  beschreibung: '',
  eigenanteil: 0,
  lieferzeit: '3 Werktage',
  kategorie: 'x',
  merkmale: [],
});

const versorgung = (produktId: string, status: Versorgung['status'] = 'PENDING_INSURANCE'): Versorgung => ({
  id: `v-${produktId}`,
  status,
  produkt: `Produkt ${produktId}`,
  produktId,
  hilfsmittelNr: '00.00.00.0001',
  arzt: '',
  krankenkasse: '',
  erstellt: '',
  aktualisiert: '',
  timeline: [],
  offeneAktionen: [],
  selbstzahler: false,
});

const kategorie = (slug: string): KatalogKategorie => ({ id: `k-${slug}`, name: slug, slug, parentId: 'haupt', beschreibung: '', icon: 'box', sortOrder: 0 });
const KATEGORIEN = ['rollatoren', 'gehhilfen', 'rollstuehle', 'rampen'].map(kategorie);

describe('baueVorschlaege', () => {
  it('schlägt Zubehör der eigenen Versorgung vor — ohne bereits Bestelltes, ohne Doppelte', () => {
    const passend = new Map<string, PassendeProdukte>([
      ['rollator', { zubehoer: [produkt('korb', 'Korb'), produkt('stock', 'Stock')], ersatzteil: [produkt('rad', 'Rad')], dienstleistung: [] }],
      ['stock', { zubehoer: [produkt('korb', 'Korb')], ersatzteil: [], dienstleistung: [] }],
    ]);
    const { produkte } = baueVorschlaege([versorgung('rollator'), versorgung('stock')], new Map(), passend, KATEGORIEN);
    expect(produkte.map((p) => [p.produkt.id, p.zu])).toEqual([['korb', 'Produkt rollator']]);
  });

  it('zeigt Kategorien desselben Alltagsbedarfs, nicht die eigene', () => {
    const details = new Map([['rollator', { kategorieSlug: 'rollatoren' } as ProduktDetail]]);
    const { kategorien } = baueVorschlaege([versorgung('rollator')], details, new Map(), KATEGORIEN);
    expect(kategorien.map((k) => k.kategorie.slug)).toEqual(['gehhilfen', 'rollstuehle']);
    expect(kategorien[0].bedarf).toBe('Sicher gehen');
  });

  it('bleibt ohne Versorgungen leer', () => {
    expect(baueVorschlaege([], new Map(), new Map(), KATEGORIEN)).toEqual({ produkte: [], kategorien: [] });
  });
});
