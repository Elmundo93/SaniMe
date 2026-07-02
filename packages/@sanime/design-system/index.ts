import { colors } from './colors';
import { spacing } from './spacing';
import { radiusCompat } from './radius';
import { fontCompat } from './typography';
import { springsCompat } from './springs';
import { shadowsCompat } from './shadows';

export * from './colors';
export * from './spacing';
export * from './radius';
export * from './blur';
export * from './glass';
export * from './opacity';
export * from './shadows';
export * from './typography';
export * from './durations';
export * from './springs';
export * from './haptics';
export * from './elevation';

/**
 * Kombiniertes Objekt in der Form des bisherigen `D` aus constants/design.ts —
 * erlaubt bestehenden Konsumenten einen reinen Importpfad-Wechsel.
 */
export const D = {
  color: colors,
  space: spacing,
  radius: radiusCompat,
  font: fontCompat,
  spring: springsCompat,
  shadow: shadowsCompat,
} as const;
