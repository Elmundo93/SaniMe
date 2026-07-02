import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { OrderStatus } from '../../types';
import { D, semantic } from '@sanime/design-system';
import { StatusLabel } from '../../constants/labels';

const STATUS_COLORS: Record<OrderStatus, { text: string; bg: string }> = {
  PENDING_PRESCRIPTION: { text: semantic.warning, bg: semantic.warningLight },
  PENDING_REVIEW: { text: semantic.warning, bg: semantic.warningLight },
  PENDING_INSURANCE: { text: semantic.info, bg: semantic.infoLight },
  APPROVED: { text: semantic.success, bg: semantic.successLight },
  PROCESSING: { text: semantic.info, bg: semantic.infoLight },
  SHIPPED: { text: semantic.info, bg: semantic.infoLight },
  DELIVERED: { text: semantic.success, bg: semantic.successLight },
  CANCELLED: { text: D.color.inkTertiary, bg: D.color.bg },
  REJECTED: { text: semantic.critical, bg: semantic.criticalLight },
};

interface StatusBadgeProps {
  status: OrderStatus;
  klein?: boolean;
}

export function StatusBadge({ status, klein = false }: StatusBadgeProps) {
  const farben = STATUS_COLORS[status] ?? { text: D.color.inkTertiary, bg: D.color.bg };
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
