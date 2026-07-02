// 8pt-Grid: 4, 8, 12, 16, 24, 32, 40, 48, 64

export const spacingScale = [4, 8, 12, 16, 24, 32, 40, 48, 64] as const;

/** Kompatibel zu D.space (xs/sm/md/lg/xl/xxl unverändert), plus zwei neue Zwischenstufen. */
export const spacing = {
  xs: 4,
  sm: 8,
  sm2: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xl2: 40,
  xxl: 48,
  xxxl: 64,
} as const;
