import { pruefeDatumPlausibel, pruefeGeburtsdatumPlausibel, pruefeIk, pruefeLanr, wendeValidatorenAn } from './validatoren';
import type { RezeptFelder } from './typen';

function feld(wert: string, confidence: 'high' | 'medium' | 'low' = 'high') {
  return { wert, confidence };
}

describe('pruefeLanr', () => {
  it('akzeptiert eine LANR mit korrekter Prüfziffer', () => {
    // Ziffern 1-6: 1,2,3,4,5,6 -> Gewichte [4,9,4,9,4,9]
    // Summe = 1*4 + 2*9 + 3*4 + 4*9 + 5*4 + 6*9 = 4+18+12+36+20+54 = 144
    // Prüfziffer = (10 - (144 % 10)) % 10 = (10 - 4) % 10 = 6
    expect(pruefeLanr('123456600')).toBe(true);
  });

  it('lehnt eine LANR mit falscher Prüfziffer ab', () => {
    expect(pruefeLanr('123456700')).toBe(false);
  });

  it('lehnt ein nicht 9-stelliges Format ab', () => {
    expect(pruefeLanr('12345')).toBe(false);
    expect(pruefeLanr('abcdefghi')).toBe(false);
  });
});

describe('pruefeIk', () => {
  it('akzeptiert eine IK mit korrekter Prüfziffer (bekanntes Beispiel: TK)', () => {
    expect(pruefeIk('260940566')).toBe(true);
  });

  it('lehnt eine IK mit falscher Prüfziffer ab', () => {
    expect(pruefeIk('260940567')).toBe(false);
  });

  it('lehnt ein nicht 9-stelliges Format ab', () => {
    expect(pruefeIk('12345')).toBe(false);
  });
});

describe('pruefeDatumPlausibel', () => {
  const heute = new Date(2026, 6, 3);

  it('akzeptiert ein aktuelles Datum', () => {
    expect(pruefeDatumPlausibel('01.07.2026', heute)).toBe(true);
  });

  it('lehnt ein Datum weit in der Zukunft ab', () => {
    expect(pruefeDatumPlausibel('01.07.2030', heute)).toBe(false);
  });

  it('lehnt ein Datum älter als ein Jahr ab', () => {
    expect(pruefeDatumPlausibel('01.01.2024', heute)).toBe(false);
  });

  it('lehnt ein ungültiges Kalenderdatum ab', () => {
    expect(pruefeDatumPlausibel('31.02.2026', heute)).toBe(false);
  });
});

describe('pruefeGeburtsdatumPlausibel', () => {
  const heute = new Date(2026, 6, 3);

  it('akzeptiert ein plausibles Geburtsdatum', () => {
    expect(pruefeGeburtsdatumPlausibel('15.03.1972', heute)).toBe(true);
  });

  it('lehnt ein Geburtsdatum in der Zukunft ab', () => {
    expect(pruefeGeburtsdatumPlausibel('01.01.2027', heute)).toBe(false);
  });

  it('lehnt ein unplausibel hohes Alter ab', () => {
    expect(pruefeGeburtsdatumPlausibel('01.01.1850', heute)).toBe(false);
  });
});

describe('wendeValidatorenAn', () => {
  function basisFelder(): RezeptFelder {
    return {
      patientName: feld('Max Mustermann'),
      patientGeburtsdatum: feld('15.03.1972'),
      arztName: feld('Dr. med. Sabine Müller'),
      arztLanr: feld('123456600'),
      diagnose: feld('G82.1'),
      hilfsmittel: feld('Rollstuhl'),
      hilfsmittelNr: feld('00.00.00'),
      datum: feld('01.07.2026'),
    };
  }

  it('lässt gültige Felder unverändert', () => {
    const ergebnis = wendeValidatorenAn(basisFelder());
    expect(ergebnis.arztLanr.confidence).toBe('high');
    expect(ergebnis.datum.confidence).toBe('high');
    expect(ergebnis.patientGeburtsdatum.confidence).toBe('high');
  });

  it('stuft eine LANR mit falscher Prüfziffer herab, behält aber den Wert', () => {
    const felder = { ...basisFelder(), arztLanr: feld('123456700', 'high') };
    const ergebnis = wendeValidatorenAn(felder);
    expect(ergebnis.arztLanr.confidence).toBe('medium');
    expect(ergebnis.arztLanr.wert).toBe('123456700');
  });

  it('stuft ein unplausibles Ausstellungsdatum herab', () => {
    const felder = { ...basisFelder(), datum: feld('01.01.2024', 'high') };
    const ergebnis = wendeValidatorenAn(felder);
    expect(ergebnis.datum.confidence).toBe('medium');
  });

  it('wirft nie, auch bei leeren Feldern nicht', () => {
    const felder: RezeptFelder = {
      patientName: feld('', 'low'),
      patientGeburtsdatum: feld('', 'low'),
      arztName: feld('', 'low'),
      arztLanr: feld('', 'low'),
      diagnose: feld('', 'low'),
      hilfsmittel: feld('', 'low'),
      hilfsmittelNr: feld('', 'low'),
      datum: feld('', 'low'),
    };
    expect(() => wendeValidatorenAn(felder)).not.toThrow();
  });
});
