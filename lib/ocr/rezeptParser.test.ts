import { parseRezept } from './rezeptParser';

const HEUTE = new Date(2026, 6, 3); // 03.07.2026

describe('parseRezept', () => {
  it('extrahiert alle Felder aus einem vollständigen Muster-16-Rezept', () => {
    const zeilen = [
      'Muster 16',
      'Verordnung von Hilfsmitteln',
      'Techniker Krankenkasse',
      'Name, Vorname des Versicherten',
      'Mustermann, Max',
      'geb. 15.03.1972',
      'Dr. med. Sabine Müller',
      'Praxis für Allgemeinmedizin',
      'LANR 123456600',
      'BSNR 987654321',
      'Diagnose',
      'G82.1 Paraplegie schlaff',
      'Rollstuhl, faltbar, Sitzbreite 40 cm',
      '00.00.00',
      '15.06.2026',
    ];

    const felder = parseRezept(zeilen, HEUTE);

    expect(felder.patientName.wert).toBe('Mustermann, Max');
    expect(felder.patientGeburtsdatum.wert).toBe('15.03.1972');
    expect(felder.arztName.wert).toBe('Dr. med. Sabine Müller');
    expect(felder.arztLanr.wert).toBe('123456600');
    expect(felder.arztLanr.confidence).toBe('high');
    expect(felder.diagnose.wert).toBe('G82.1 — Paraplegie schlaff');
    expect(felder.diagnose.confidence).toBe('high');
    expect(felder.hilfsmittel.wert).toContain('Rollstuhl');
    expect(felder.hilfsmittelNr.wert).toBe('00.00.00');
    expect(felder.datum.wert).toBe('15.06.2026');
    expect(felder.datum.confidence).toBe('high');
  });

  it('liefert leere Felder mit low-Confidence statt zu werfen, wenn nichts erkannt wird', () => {
    const zeilen = ['Irgendein unleserlicher Text', 'ohne jede Struktur'];
    const felder = parseRezept(zeilen, HEUTE);

    expect(felder.patientName).toEqual({ wert: '', confidence: 'low' });
    expect(felder.patientGeburtsdatum).toEqual({ wert: '', confidence: 'low' });
    expect(felder.arztLanr).toEqual({ wert: '', confidence: 'low' });
    expect(felder.diagnose).toEqual({ wert: '', confidence: 'low' });
    expect(felder.hilfsmittelNr).toEqual({ wert: '', confidence: 'low' });
  });

  it('stuft das Geburtsdatum bei mehreren plausiblen Kandidaten auf medium ab', () => {
    const zeilen = ['geb. 15.03.1972', 'Ausgestellt am 20.03.1975', 'Rollstuhl'];
    const felder = parseRezept(zeilen, HEUTE);

    // Die früheste plausible Kandidatin gewinnt, aber Mehrdeutigkeit deckelt auf medium.
    expect(felder.patientGeburtsdatum.wert).toBe('15.03.1972');
    expect(felder.patientGeburtsdatum.confidence).toBe('medium');
  });

  it('disambiguiert LANR von BSNR über das Label', () => {
    const zeilen = ['BSNR 111111111', 'LANR 123456600'];
    const felder = parseRezept(zeilen, HEUTE);
    expect(felder.arztLanr.wert).toBe('123456600');
    expect(felder.arztLanr.confidence).toBe('high');
  });
});
