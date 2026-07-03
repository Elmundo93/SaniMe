import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { D } from '@sanime/design-system';

interface VollstaendigkeitsBadgeProps {
  fehlend: number;
}

export function VollstaendigkeitsBadge({ fehlend }: VollstaendigkeitsBadgeProps) {
  if (fehlend === 0) {
    return <View style={[styles.punkt, { backgroundColor: D.color.success }]} accessible accessibilityLabel="vollständig" />;
  }
  return (
    <View style={styles.row} accessible accessibilityLabel={`${fehlend} ${fehlend === 1 ? 'Angabe fehlt' : 'Angaben fehlen'}`}>
      <View style={[styles.punkt, { backgroundColor: D.color.warning }]} />
      <Text style={styles.text}>{fehlend} {fehlend === 1 ? 'fehlt' : 'fehlen'}</Text>
    </View>
  );
}

export function vollstaendigkeitsLabel(fehlend: number): string {
  return fehlend === 0 ? 'vollständig' : `${fehlend} ${fehlend === 1 ? 'Angabe fehlt' : 'Angaben fehlen'}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  punkt: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  text: {
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
    fontWeight: D.font.medium,
  },
});
