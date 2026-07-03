import { erkenneDokumenttyp } from './detector';

describe('erkenneDokumenttyp', () => {
  it('erkennt ein Muster-16-Rezept', () => {
    const zeilen = [
      'Muster 16',
      'Gesetzliche Krankenversicherung',
      'Verordnung von Hilfsmitteln',
      'LANR 123456789',
      'BSNR 987654321',
    ];
    expect(erkenneDokumenttyp(zeilen).typ).toBe('REZEPT');
  });

  it('erkennt eine elektronische Gesundheitskarte', () => {
    const zeilen = ['Krankenversichertenkarte', 'Gesundheitskarte', 'Gültig bis 12/2028', '260940566'];
    expect(erkenneDokumenttyp(zeilen).typ).toBe('EGK');
  });

  it('liefert UNBEKANNT ohne jegliche Marker', () => {
    const zeilen = ['Einkaufsliste', 'Milch', 'Brot'];
    const ergebnis = erkenneDokumenttyp(zeilen);
    expect(ergebnis.typ).toBe('UNBEKANNT');
    expect(ergebnis.score).toBe(0);
  });
});
