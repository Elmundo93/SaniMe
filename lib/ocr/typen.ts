import type { ConfidenceLevel } from '@sanime/domain';

// Interne Zwischen-Repräsentation der Parser-Pipeline — bewusst getrennt von
// den Domänentypen in types/index.ts, da hier auch Felder ohne eigenes
// OcrConfidence-Gegenstück (z.B. datum, hilfsmittelNr) mitgeführt werden.
export interface FeldResultat {
  wert: string;
  confidence: ConfidenceLevel;
}

export type DokumentTyp = 'UNBEKANNT' | 'REZEPT' | 'EGK';

// Fachliche Auffälligkeiten des Rezepts — blockieren nie, der Nutzer
// entscheidet nach einem Hinweis selbst, ob er das Rezept verwendet.
export type RezeptHinweis = 'BEREITS_EINGELOEST' | 'AELTER_ALS_28_TAGE';

export interface RezeptFelder {
  patientName: FeldResultat;
  patientGeburtsdatum: FeldResultat;
  arztName: FeldResultat;
  arztLanr: FeldResultat;
  diagnose: FeldResultat;
  hilfsmittel: FeldResultat;
  hilfsmittelNr: FeldResultat;
  datum: FeldResultat;
  // Das Personalienfeld des Muster 16 trägt dieselben Kassendaten wie die eGK.
  krankenkasseName: FeldResultat;
  ik: FeldResultat;
  versichertenNr: FeldResultat;
}

export interface EgkFelder {
  krankenkasseName: FeldResultat;
  versichertenNr: FeldResultat;
  ik: FeldResultat;
}
