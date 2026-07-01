import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { OrderStatus } from '../../types';
import { StatusColors } from '../../constants/colors';
import { StatusLabel } from '../../constants/labels';

interface StatusBadgeProps {
  status: OrderStatus;
  klein?: boolean;
}

export function StatusBadge({ status, klein = false }: StatusBadgeProps) {
  const farben = StatusColors[status] ?? { text: '#475569', bg: '#F0F4F8' };
  const label = StatusLabel[status] ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: farben.bg }, klein && styles.badgeKlein]}>
      <Text style={[styles.text, { color: farben.text }, klein && styles.textKlein]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeKlein: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textKlein: {
    fontSize: 11,
  },
});
