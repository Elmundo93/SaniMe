import type { ConfidenceLevel, OcrConfidence, OcrKrankenkasse, OcrResult, Produkt } from '@sanime/domain';
import { MOCK_PRODUKTE } from '../mockOcr';
import { extrahiereText } from './engine';
import { normalisiereBild } from './processor';
import { erkenneDokumenttyp } from './detector';
import { parseRezept } from './rezeptParser';
import { parseEgk } from './egkParser';
import { wendeValidatorenAn } from './validatoren';
import { baueKrankenkasseErgebnis, baueRezeptErgebnis } from './mapper';
import type { DokumentTyp } from './typen';

export { erkenneDokumenttyp } from './detector';
export type { DokumentTyp, EgkFelder, FeldResultat, RezeptFelder } from './typen';

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
export async function erkenneRezept(uri: string): Promise<{ result: OcrResult; confidence: OcrConfidence }> {
  const normalisiert = await normalisiereBild(uri);
  const zeilen = await extrahiereText(normalisiert);
  if (zeilen.length === 0) {
    throw new Error('Keine Textinformation im Bild erkannt.');
  }
  if (erkenneDokumenttyp(zeilen).typ === 'EGK') {
    throw new FalschesDokumentError('EGK');
  }

  const felder = wendeValidatorenAn(parseRezept(zeilen));
  return baueRezeptErgebnis(felder);
}

// 1:1-Ersatz für simuliereKrankenkasseOcr() — der Produktkatalog ist weiterhin
// gemockt (eigenständiges, von der OCR unabhängiges Backend-Thema, siehe
// CLAUDE.md), nur die Krankenkassen-Felder kommen jetzt aus echtem OCR.
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
  return { krankenkasse, confidence, produkte: MOCK_PRODUKTE };
}
