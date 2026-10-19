import { useCallback, useRef } from 'react';
import { useOnboardingStore } from '../store/onboardingStore';
import type { OcrResult } from '@sanime/domain';

// Geteilt von review.tsx und datenpruefung.tsx. Zwei Dinge, die ein naives
// `dispatch({ type: 'FELD_KORRIGIERT', patch: { patient: { ...ocr.patient, name } } })`
// falsch macht:
// - Der Patch wird erst gebaut, wenn er an der Reihe ist, und zwar aus dem
//   *aktuellen* Store-Stand statt aus dem `ocr` des letzten Renders.
// - Korrekturen laufen nacheinander: dispatch() ist request-then-apply, ein
//   zweiter PATCH, der vor der Antwort des ersten startet, würde dessen
//   Korrektur mit dem alten Wert überschreiben (z.B. Name → Geburtsdatum
//   schnell hintereinander, beide im `patient`-Objekt).
// `abwarten()` vor WEITER/ZURUECK aufrufen: ein Tap auf „Weiter“ direkt aus
// einem offenen Feld löst Blur-Korrektur und WEITER gleichzeitig aus.
export function useFeldKorrektur() {
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const warteschlange = useRef<Promise<unknown>>(Promise.resolve());

  const feldKorrigiert = useCallback(
    (baue: (ocr: OcrResult) => Partial<OcrResult>) => {
      warteschlange.current = warteschlange.current.then(() => {
        const ocr = useOnboardingStore.getState().session?.ocrResult;
        if (!ocr) return;
        return dispatch({ type: 'FELD_KORRIGIERT', patch: baue(ocr) });
      });
    },
    [dispatch],
  );

  const abwarten = useCallback(() => warteschlange.current, []);

  return { feldKorrigiert, abwarten };
}
