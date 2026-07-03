import { baueKrankenkasseErgebnis, baueRezeptErgebnis } from './mapper';
import type { EgkFelder, RezeptFelder } from './typen';

function feld(wert: string, confidence: 'high' | 'medium' | 'low') {
  return { wert, confidence };
}

describe('baueRezeptErgebnis', () => {
  it('baut die exakte OcrResult/OcrConfidence-Shape aus den Parser-Feldern', () => {
    const felder: RezeptFelder = {
      patientName: feld('Mustermann, Max', 'medium'),
      patientGeburtsdatum: feld('15.03.1972', 'high'),
      arztName: feld('Dr. med. Sabine Müller', 'medium'),
      arztLanr: feld('123456600', 'high'),
      diagnose: feld('G82.1 — Paraplegie', 'high'),
      hilfsmittel: feld('Rollstuhl, faltbar', 'medium'),
      hilfsmittelNr: feld('00.00.00', 'high'),
      datum: feld('15.06.2026', 'high'),
    };

    const { result, confidence } = baueRezeptErgebnis(felder);

    expect(result).toEqual({
      patient: { name: 'Mustermann, Max', dateOfBirth: '15.03.1972' },
      arzt: { name: 'Dr. med. Sabine Müller', lanr: '123456600' },
      krankenkasse: { name: '', versichertenNr: '' },
      diagnose: 'G82.1 — Paraplegie',
      hilfsmittel: 'Rollstuhl, faltbar',
      hilfsmittelNr: '00.00.00',
      datum: '15.06.2026',
    });
    // patient-Gruppe: die schlechtere der beiden Einzel-Confidences (medium < high)
    expect(confidence.patient).toBe('medium');
    expect(confidence.arzt).toBe('medium');
    expect(confidence.krankenkasse).toBe('low');
    expect(confidence.diagnose).toBe('high');
    expect(confidence.hilfsmittel).toBe('medium');
  });

  it('lässt leere Felder als leere Strings statt undefined/null durch (außer optionale lanr/hilfsmittelNr)', () => {
    const leeresFeld = feld('', 'low' as const);
    const felder: RezeptFelder = {
      patientName: leeresFeld,
      patientGeburtsdatum: leeresFeld,
      arztName: leeresFeld,
      arztLanr: leeresFeld,
      diagnose: leeresFeld,
      hilfsmittel: leeresFeld,
      hilfsmittelNr: leeresFeld,
      datum: leeresFeld,
    };

    const { result } = baueRezeptErgebnis(felder);
    expect(result.patient.name).toBe('');
    expect(result.arzt.lanr).toBeUndefined();
    expect(result.hilfsmittelNr).toBeUndefined();
  });
});

describe('baueKrankenkasseErgebnis', () => {
  it('baut die exakte OcrKrankenkasse-Shape aus den Parser-Feldern', () => {
    const felder: EgkFelder = {
      krankenkasseName: feld('Techniker Krankenkasse', 'high'),
      versichertenNr: feld('A123456789', 'high'),
      ik: feld('260940566', 'high'),
    };

    const { krankenkasse, confidence } = baueKrankenkasseErgebnis(felder);

    expect(krankenkasse).toEqual({ name: 'Techniker Krankenkasse', ik: '260940566', versichertenNr: 'A123456789' });
    expect(confidence).toBe('high');
  });

  it('lässt eine fehlende IK als undefined durch, statt als leeren String', () => {
    const felder: EgkFelder = {
      krankenkasseName: feld('AOK', 'medium'),
      versichertenNr: feld('B987654321', 'high'),
      ik: feld('', 'low'),
    };

    const { krankenkasse, confidence } = baueKrankenkasseErgebnis(felder);
    expect(krankenkasse.ik).toBeUndefined();
    // Gesamt-Confidence ignoriert die IK (optionales Metadatum) — nimmt nur
    // die schlechtere von Name/Versichertennummer.
    expect(confidence).toBe('medium');
  });
});
