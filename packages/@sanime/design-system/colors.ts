// SaniMe Design System — Farbpalette
// Primary: Glacier / Ice / Sky / Accent Blue

export const primary = {
  glacier: '#EAF4FF',
  ice: '#C7E4FF',
  sky: '#7FC2FF',
  accent: '#2F6FE4',
} as const;

export const neutral = {
  background: '#F5F8FC',
  surface: '#FFFFFF',
  surfaceElevated: '#FCFEFF',
  border: '#E1E8F2',
  separator: '#EDF2F8',
} as const;

export const semantic = {
  success: '#2FA968',
  successLight: 'rgba(47,169,104,0.12)',
  warning: '#F0A020',
  warningLight: 'rgba(240,160,32,0.12)',
  info: '#3E8EFF',
  infoLight: 'rgba(62,142,255,0.12)',
  critical: '#E5484D',
  criticalLight: 'rgba(229,72,77,0.12)',
} as const;

export const gradients = {
  hero: [primary.sky, primary.accent] as const,
  card: [neutral.background, primary.glacier] as const,
  splash: ['#060B1A', '#173A73'] as const,
  glassReflection: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.05)'] as const,
} as const;

export const ink = {
  ink: '#0B1220',
  inkSecondary: '#3A4B66',
  // WCAG-AA-Kontrast (~4.5:1) auf neutral.background
  inkTertiary: '#5C7093',
  inkInverted: '#FFFFFF',
} as const;

export const glassTint = {
  glassBase: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.70)',
  glassBlue: 'rgba(127,194,255,0.08)',
  glassStrong: 'rgba(255,255,255,0.72)',
} as const;

export const dark = {
  dark: '#070B18',
  darkCard: 'rgba(255,255,255,0.06)',
  darkBorder: 'rgba(255,255,255,0.10)',
} as const;

/**
 * Flache Kompatibilitätsform des alten `D.color`-Objekts (constants/design.ts) —
 * gleiche Rollen/Keys, neue Werte. Erlaubt bestehenden Konsumenten einen reinen
 * Importpfad-Wechsel ohne Zugriffsmuster-Änderung.
 */
export const colors = {
  gradientTop: primary.sky,
  gradientMid: '#4F8EEF',
  gradientBottom: primary.accent,

  bg: neutral.background,
  bgSoft: '#F7FAFD',
  bgLighter: '#FBFDFF',

  ...glassTint,
  ...ink,

  accent: primary.accent,
  accentLight: 'rgba(47,111,228,0.10)',
  accentGlow: 'rgba(47,111,228,0.35)',
  success: semantic.success,
  successLight: semantic.successLight,
  warning: semantic.warning,
  warningLight: semantic.warningLight,
  error: semantic.critical,
  errorLight: semantic.criticalLight,

  ...dark,
} as const;
