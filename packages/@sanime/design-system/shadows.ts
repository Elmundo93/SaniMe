import type { ViewStyle } from 'react-native';

// Drei Ebenen — subtil, wie bei Apple: geringe Opacity, großer Radius

export const shadows: Record<'low' | 'medium' | 'floating', ViewStyle> = {
  low: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  medium: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 7,
  },
  floating: {
    shadowColor: '#2F6FE4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 12,
  },
};

/** Kompatibel zu D.shadow — gleiche Rollen (card/fab/strong), neue, dezentere Werte. */
export const shadowsCompat: Record<'card' | 'fab' | 'strong', ViewStyle> = {
  card: shadows.low,
  fab: shadows.floating,
  strong: shadows.medium,
};
