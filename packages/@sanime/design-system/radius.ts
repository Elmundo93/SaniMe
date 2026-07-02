// Komponentenbezogene Eckenradien laut Designplan

export const radius = {
  button: 16,
  card: 28,
  modal: 36,
  cameraButton: 40,
  avatar: '50%',
} as const;

/** Kompatibel zu D.radius — `sm` wandert von 12 auf den neuen Button-Radius (16). */
export const radiusCompat = {
  sm: radius.button,
  md: 20,
  lg: radius.card,
  xl: radius.modal,
  full: 999,
} as const;
