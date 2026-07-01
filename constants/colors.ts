export const Colors = {
  primary: '#005FCC',
  primaryLight: '#E8F0FE',
  primaryDark: '#003D8A',

  background: '#FFFFFF',
  surface: '#F7F9FC',

  ink: '#0F172A',
  inkSecondary: '#475569',
  inkTertiary: '#64748B', // dunkler als das ursprüngliche #94A3B8 (~2.6:1 auf Weiß) für WCAG-AA-Kontrast (~4.6:1)

  border: '#E2E8F0',
  borderFocused: '#005FCC',

  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#DBEAFE',

  white: '#FFFFFF',
  black: '#000000',

  // Splash / Dark
  dark: '#0F172A',
  darkMuted: '#1E293B',
} as const;

export const StatusColors: Record<string, { text: string; bg: string }> = {
  PENDING_PRESCRIPTION: { text: Colors.warning, bg: Colors.warningBg },
  PENDING_REVIEW: { text: Colors.warning, bg: Colors.warningBg },
  PENDING_INSURANCE: { text: Colors.info, bg: Colors.infoBg },
  APPROVED: { text: Colors.success, bg: Colors.successBg },
  PROCESSING: { text: Colors.info, bg: Colors.infoBg },
  SHIPPED: { text: Colors.info, bg: Colors.infoBg },
  DELIVERED: { text: Colors.success, bg: Colors.successBg },
  CANCELLED: { text: Colors.inkTertiary, bg: Colors.surface },
  REJECTED: { text: Colors.error, bg: Colors.errorBg },
};
