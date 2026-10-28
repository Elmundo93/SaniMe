import type { ConfidenceLevel, OcrConfidence, OcrKrankenkasse, OcrResult, Produkt } from '@sanime/domain';
import { extrahiereText } from './engine';
import { normalisiereBild } from './processor';
import { erkenneDokumenttyp } from './detector';
import { erkenneHinweise, parseRezept } from './rezeptParser';
import { parseEgk } from './egkParser';
import { wendeValidatorenAn } from './validatoren';
import { baueKrankenkasseErgebnis, baueRezeptErgebnis } from './mapper';
import type { DokumentTyp, RezeptHinweis } from './typen';

export { erkenneDokumenttyp } from './detector';
export type { DokumentTyp, EgkFelder, FeldResultat, RezeptFelder, RezeptHinweis } from './typen';

// Wird geworfen, wenn der Detector ein anderes Dokument erkennt als das, das
// der aufrufende Scan-Screen erwartet (z.B. eGK statt Rezept fotografiert).
// Getrennt von der generischen "Bild unlesbar"-Fehlermeldung, damit der Nutzer
// einen konkreten, handlungsorientierten Hinweis bekommt (CLAUDE.md-Regel).
export class FalschesDokumentError extends Error {
  erkannterTyp: DokumentTyp;

  constructor(erkannterTyp: DokumentTyp) {
    super(`Falsches Dokument erkannt: ${erkannterTyp}`);
    this.erkannterTyp = erkannterTyp;
  }
}

// 1:1-Ersatz für simuliereRezeptOcr() aus lib/mockOcr.ts — nimmt jetzt die
// URI des aufgenommenen Fotos entgegen. Wirft nur, wenn das Bild unlesbar
// ist (native Engine-Fehler oder keine erkannte Textzeile) oder der Detector
// eindeutig eine eGK statt eines Rezepts erkennt; der bestehende catch-Block
// in app/scan/rezept.tsx zeigt in diesen Fällen einen handlungsorientierten
// Alert. Liefert die Engine Text, extrahiert der Parser aber wenig, wird
// trotzdem mit einem größtenteils leeren/'low' Ergebnis aufgelöst — der
// Nutzer korrigiert im Review-Screen von Hand.
// `hinweise` sind fachliche Auffälligkeiten (eingelöst, zu alt) — reiner
// Client-Hinweis vor dem Weitermachen, nicht Teil des OcrResult.
export async function erkenneRezept(
  uri: string,
): Promise<{ result: OcrResult; confidence: OcrConfidence; hinweise: RezeptHinweis[] }> {
  const normalisiert = await normalisiereBild(uri);
  const zeilen = await extrahiereText(normalisiert);
  if (zeilen.length === 0) {
    throw new Error('Keine Textinformation im Bild erkannt.');
  }
  if (erkenneDokumenttyp(zeilen).typ === 'EGK') {
    throw new FalschesDokumentError('EGK');
  }

  const felder = wendeValidatorenAn(parseRezept(zeilen));
  return { ...baueRezeptErgebnis(felder), hinweise: erkenneHinweise(zeilen, felder) };
}

// 1:1-Ersatz für simuliereKrankenkasseOcr(). `produkte` is always [] here —
// the backend recomputes it from the real catalog server-side for both the
// KRANKENKASSE_OCR_ABGESCHLOSSEN and KRANKENKASSE_UEBERSPRUNGEN events and
// discards whatever the client sends (see onboarding.service.ts's patch()),
// so there's nothing for the client to fill in even provisionally.
export async function erkenneKrankenkasse(
  uri: string,
): Promise<{ krankenkasse: OcrKrankenkasse; confidence: ConfidenceLevel; produkte: Produkt[] }> {
  const normalisiert = await normalisiereBild(uri);
  const zeilen = await extrahiereText(normalisiert);
  if (zeilen.length === 0) {
    throw new Error('Keine Textinformation im Bild erkannt.');
  }
  if (erkenneDokumenttyp(zeilen).typ === 'REZEPT') {
    throw new FalschesDokumentError('REZEPT');
  }

  const { krankenkasse, confidence } = baueKrankenkasseErgebnis(parseEgk(zeilen));
  return { krankenkasse, confidence, produkte: [] };
}
