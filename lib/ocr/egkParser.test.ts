import { parseEgk } from './egkParser';

describe('parseEgk', () => {
  it('extrahiert alle Felder aus einer vollständigen eGK', () => {
    const zeilen = [
      'TECHNIKER KRANKENKASSE',
      'Mustermann Max',
      'geb. 15.03.1972',
      'Versicherten-Nr.: A123456789',
      'IK 260940566',
      'gültig bis 12/2028',
    ];

    const felder = parseEgk(zeilen);

    expect(felder.krankenkasseName.wert).toBe('TECHNIKER KRANKENKASSE');
    expect(felder.krankenkasseName.confidence).toBe('high');
    expect(felder.versichertenNr.wert).toBe('A123456789');
    expect(felder.versichertenNr.confidence).toBe('high');
    expect(felder.ik.wert).toBe('260940566');
    expect(felder.ik.confidence).toBe('high');
  });

  it('stuft eine IK mit falscher Prüfziffer auf medium ab', () => {
    const zeilen = ['AOK', 'Versicherten-Nr.: B987654321', 'IK 260940567'];
    const felder = parseEgk(zeilen);
    expect(felder.ik.wert).toBe('260940567');
    expect(felder.ik.confidence).toBe('medium');
  });

  it('erkennt einen unbekannten Kassennamen nur als medium-Fallback', () => {
    const zeilen = ['Meine Kranke Kasse eG', 'Versicherten-Nr.: C111111119'];
    const felder = parseEgk(zeilen);
    expect(felder.krankenkasseName.wert).toBe('Meine Kranke Kasse eG');
    expect(felder.krankenkasseName.confidence).toBe('medium');
  });

  it('liefert Versichertennummer/IK leer mit low-Confidence statt zu werfen, wenn kein Format-Treffer existiert', () => {
    // krankenkasseName hat bewusst einen lockeren Zeilen-Fallback (wie hilfsmittel
    // im Rezept-Parser) und liefert daher auch ohne echten Kassennamen einen
    // medium-Kandidaten — versichertenNr/ik verlangen dagegen ein Format-Match.
    const zeilen = ['völlig unleserlicher Text', 'ohne jede Struktur'];
    const felder = parseEgk(zeilen);

    expect(felder.versichertenNr).toEqual({ wert: '', confidence: 'low' });
    expect(felder.ik).toEqual({ wert: '', confidence: 'low' });
  });

  it('liefert auch krankenkasseName leer, wenn keine Zeile überhaupt in Frage kommt', () => {
    const zeilen = ['123456789', '987654321.0011'];
    const felder = parseEgk(zeilen);
    expect(felder.krankenkasseName).toEqual({ wert: '', confidence: 'low' });
  });

  it('verwechselt die in der Versichertennummer enthaltenen Ziffern nicht mit der IK', () => {
    const zeilen = ['AOK', 'Versicherten-Nr.: A123456789'];
    const felder = parseEgk(zeilen);
    expect(felder.versichertenNr.wert).toBe('A123456789');
    expect(felder.ik).toEqual({ wert: '', confidence: 'low' });
  });
});
