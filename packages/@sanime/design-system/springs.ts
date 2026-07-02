// Kompatibel zu D.spring — unverändert, plus die 4 im Designplan benannten Rollen als Aliase.

export const springsCompat = {
  gentle: { damping: 18, stiffness: 180, mass: 1 },
  bouncy: { damping: 10, stiffness: 200, mass: 0.8 },
  smooth: { damping: 22, stiffness: 280, mass: 1 },
  snappy: { damping: 15, stiffness: 350, mass: 0.9 },
  breath: { damping: 6, stiffness: 80, mass: 1 },
} as const;

export const springs = {
  primary: springsCompat.smooth,
  navigation: springsCompat.gentle,
  button: springsCompat.snappy,
  hero: springsCompat.bouncy,
} as const;
