import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { D } from '@sanime/design-system';

interface SectionHeaderProps {
  titel: string;
  aktionLabel?: string;
  onAktion?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({ titel, aktionLabel, onAktion, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.titel}>{titel}</Text>
      {aktionLabel && onAktion && (
        <TouchableOpacity onPress={onAktion} hitSlop={12}>
          <Text style={styles.aktion}>{aktionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titel: {
    fontSize: 18,
    fontWeight: '700',
    color: D.color.ink,
  },
  aktion: {
    fontSize: 14,
    fontWeight: '600',
    color: D.color.accent,
  },
});
