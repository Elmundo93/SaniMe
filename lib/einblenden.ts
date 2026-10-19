import { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';

const DAUER_MS = 420;
const VERSATZ_PX = 14;

/** Einheitliche Eingangsanimation für Listen-/Karten-Elemente: kurzes Einblenden mit
 * leichtem Hochgleiten, sanft auslaufend. Bewusst ohne `springify()` — die Feder schwang
 * über das Ziel hinaus und ließ die Elemente beim Öffnen sichtbar nachwippen.
 * `ReduceMotion.System` macht die Systemeinstellung „Bewegung reduzieren“ explizit —
 * zentral hier, damit sie für jede Liste der App gilt. */
export function einblenden(verzoegerungMs = 0) {
  return FadeInDown.delay(verzoegerungMs)
    .duration(DAUER_MS)
    .easing(Easing.out(Easing.cubic))
    .reduceMotion(ReduceMotion.System)
    .withInitialValues({ opacity: 0, transform: [{ translateY: VERSATZ_PX }] });
}
