import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { D } from '@sanime/design-system';

interface BackLinkProps {
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
  /** 'light' (Standard) = akzentfarben auf hellem Grund; 'dark' = für dunkle Hero-Screens. */
  variant?: 'light' | 'dark';
}

/** Text-Variante des Zurück-Links (Icon + Label) — für Stellen ohne eigenen Header-Balken,
 * z.B. vor Content oder auf dunklen Hero-Screens. Für den Header-Kreisbutton siehe BackButton. */
export function BackLink({ onPress, label = 'Zurück', accessibilityLabel, variant = 'light' }: BackLinkProps) {
  const color = variant === 'dark' ? D.color.gradientMid : D.color.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={12}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Feather name="arrow-left" size={16} color={color} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  text: {
    fontSize: D.font.md,
    fontWeight: D.font.semibold,
  },
});
