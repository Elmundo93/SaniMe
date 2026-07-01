// SaniMe Design System — Apple-Premium
// Frost Blue, Glassmorphism, Physics-Based Motion

export const D = {
  // ── Farben ─────────────────────────────────────────────────
  color: {
    // Frost-Blue Gradient (primary action)
    gradientTop:    '#7BC9FF',
    gradientMid:    '#5FAEFF',
    gradientBottom: '#3F8BFF',

    // Hintergründe — leicht blau getönt, nie reines Weiß
    bg:             '#F7F9FC',
    bgSoft:         '#F9FBFD',
    bgLighter:      '#FCFDFF',

    // Glass Layers
    glassBase:      'rgba(255,255,255,0.55)',
    glassBorder:    'rgba(255,255,255,0.75)',
    glassBlue:      'rgba(123,201,255,0.08)',
    glassStrong:    'rgba(255,255,255,0.72)',

    // Ink
    ink:            '#0A0F1E',
    inkSecondary:   '#3D5273',
    inkTertiary:    '#5A6E8C', // dunkler als das ursprüngliche #8498B5 (~3:1 auf bg) für WCAG-AA-Kontrast (~4.5:1)
    inkInverted:    '#FFFFFF',

    // Status (Apple-Farben)
    accent:         '#3F8BFF',
    accentLight:    'rgba(63,139,255,0.10)',
    accentGlow:     'rgba(63,139,255,0.35)',
    success:        '#34C759',
    successLight:   'rgba(52,199,89,0.12)',
    warning:        '#FF9F0A',
    warningLight:   'rgba(255,159,10,0.12)',
    error:          '#FF3B30',
    errorLight:     'rgba(255,59,48,0.12)',

    // Onboarding Background
    dark:           '#080E20',
    darkCard:       'rgba(255,255,255,0.06)',
    darkBorder:     'rgba(255,255,255,0.10)',
  },

  // ── Abstände ───────────────────────────────────────────────
  space: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  // ── Eckenradien ───────────────────────────────────────────
  radius: {
    sm:   12,
    md:   20,
    lg:   28,
    xl:   36,
    full: 999,
  },

  // ── Typografie ────────────────────────────────────────────
  font: {
    // Gewichte
    regular:     '400' as const,
    medium:      '500' as const,
    semibold:    '600' as const,
    bold:        '700' as const,
    heavy:       '800' as const,
    black:       '900' as const,

    // Größen
    xs:    11,
    sm:    13,
    md:    15,
    lg:    17,
    xl:    22,
    xxl:   28,
    hero:  40,
    giant: 52,
  },

  // ── Spring-Presets ────────────────────────────────────────
  spring: {
    gentle:  { damping: 18, stiffness: 180, mass: 1 },
    bouncy:  { damping: 10, stiffness: 200, mass: 0.8 },
    smooth:  { damping: 22, stiffness: 280, mass: 1 },
    snappy:  { damping: 15, stiffness: 350, mass: 0.9 },
    breath:  { damping:  6, stiffness:  80, mass: 1 },
  },

  // ── Schatten ──────────────────────────────────────────────
  shadow: {
    card: {
      shadowColor: '#0A1633',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 6,
    },
    fab: {
      shadowColor: '#3F8BFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.40,
      shadowRadius: 24,
      elevation: 12,
    },
    strong: {
      shadowColor: '#0A1633',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 32,
      elevation: 10,
    },
  },
} as const;
