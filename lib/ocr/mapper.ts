import type { ConfidenceLevel, OcrConfidence, OcrKrankenkasse, OcrResult } from '../../types';
import type { EgkFelder, RezeptFelder } from './typen';

const RANG: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };

function schlechtere(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  return RANG[a] <= RANG[b] ? a : b;
}

// Baut die exakte Ziel-Shape, die zuvor simuliereRezeptOcr() zurückgab —
// OcrConfidence kennt nur ein Feld pro Gruppe (z.B. "arzt" für Name+LANR
// zusammen), daher wird pro Gruppe die schlechtere Einzel-Confidence genommen.
export function baueRezeptErgebnis(felder: RezeptFelder): { result: OcrResult; confidence: OcrConfidence } {
  const result: OcrResult = {
    patient: { name: felder.patientName.wert, dateOfBirth: felder.patientGeburtsdatum.wert },
    arzt: { name: felder.arztName.wert, lanr: felder.arztLanr.wert || undefined },
    krankenkasse: { name: '', versichertenNr: '' },
    diagnose: felder.diagnose.wert,
    hilfsmittel: felder.hilfsmittel.wert,
    hilfsmittelNr: felder.hilfsmittelNr.wert || undefined,
    datum: felder.datum.wert,
  };

  const confidence: OcrConfidence = {
    patient: schlechtere(felder.patientName.confidence, felder.patientGeburtsdatum.confidence),
    arzt: schlechtere(felder.arztName.confidence, felder.arztLanr.confidence),
    krankenkasse: 'low',
    diagnose: felder.diagnose.confidence,
    hilfsmittel: felder.hilfsmittel.confidence,
  };

  return { result, confidence };
}

// Analog zu baueRezeptErgebnis: exakte Ziel-Shape des Krankenkassen-Teils, den
// zuvor simuliereKrankenkasseOcr() zurückgab. Die IK ist optionales
// Backend-Metadatum, daher fließt sie nicht in die Gesamt-Confidence ein —
// entscheidend für den Nutzer ist vor allem eine korrekte Versichertennummer.
export function baueKrankenkasseErgebnis(felder: EgkFelder): { krankenkasse: OcrKrankenkasse; confidence: ConfidenceLevel } {
  const krankenkasse: OcrKrankenkasse = {
    name: felder.krankenkasseName.wert,
    ik: felder.ik.wert || undefined,
    versichertenNr: felder.versichertenNr.wert,
  };

  const confidence = schlechtere(felder.krankenkasseName.confidence, felder.versichertenNr.confidence);

  return { krankenkasse, confidence };
}
