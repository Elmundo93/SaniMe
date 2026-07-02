// Apple-inspirierte Typografie-Skala — feste Line-Heights, keine manuellen Anpassungen

export const typography = {
  largeHero: { fontSize: 52, lineHeight: 58, fontWeight: '800' as const },
  largeTitle: { fontSize: 40, lineHeight: 46, fontWeight: '700' as const },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  headline: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  footnote: { fontSize: 11, lineHeight: 14, fontWeight: '400' as const },
} as const;

/** Kompatibel zu D.font — unverändert (Gewichte + Größen), keine Farbentscheidung betrifft dies. */
export const fontCompat = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  black: '900' as const,

  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  hero: 40,
  giant: 52,
} as const;
