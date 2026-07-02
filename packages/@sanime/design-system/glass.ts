import { blur } from './blur';
import { opacity } from './opacity';
import { shadows } from './shadows';
import { glassTint } from './colors';

// 5 Glass-Material-Tiers — jede Ebene besitzt Blur/Tint/Opacity/Border/Shadow/Reflection.

export const glass = {
  light: {
    blur: blur.sm,
    tint: glassTint.glassBase,
    opacity: opacity.light,
    border: glassTint.glassBorder,
    shadow: shadows.low,
    reflection: 'rgba(255,255,255,0.35)',
  },
  elevated: {
    blur: blur.md,
    tint: glassTint.glassStrong,
    opacity: opacity.medium,
    border: glassTint.glassBorder,
    shadow: shadows.low,
    reflection: 'rgba(255,255,255,0.45)',
  },
  navigation: {
    blur: blur.lg,
    tint: glassTint.glassBase,
    opacity: opacity.medium,
    border: glassTint.glassBorder,
    shadow: shadows.medium,
    reflection: 'rgba(255,255,255,0.30)',
  },
  modal: {
    blur: blur.xl,
    tint: glassTint.glassStrong,
    opacity: opacity.strong,
    border: glassTint.glassBorder,
    shadow: shadows.medium,
    reflection: 'rgba(255,255,255,0.40)',
  },
  hero: {
    blur: blur.xl,
    tint: glassTint.glassBlue,
    opacity: opacity.strong,
    border: glassTint.glassBorder,
    shadow: shadows.floating,
    reflection: 'rgba(255,255,255,0.55)',
  },
} as const;
