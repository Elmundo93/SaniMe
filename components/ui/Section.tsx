import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { D } from '@sanime/design-system';
import { GlassCard } from './GlassCard';

interface SectionProps {
  titel: string;
  aktionLabel?: string;
  onAktion?: () => void;
  padding?: number;
  children: React.ReactNode;
}

/** Titel + optionaler Aktions-Link über einer GlassCard — konsolidiert die bisher
 * getrennt implementierten "Section" (Zusammenfassung) und "SettingsGruppe" (Einstellungen). */
export function Section({ titel, aktionLabel, onAktion, padding = 0, children }: SectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titel}>{titel}</Text>
        {aktionLabel && onAktion && (
          <TouchableOpacity
            onPress={onAktion}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${titel} bearbeiten`}
          >
            <Text style={styles.aktion}>{aktionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      <GlassCard padding={padding} radius={D.radius.md}>
        {children}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 4,
  },
  titel: {
    fontSize: 11,
    fontWeight: D.font.bold,
    color: D.color.inkTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  aktion: {
    fontSize: D.font.sm,
    color: D.color.accent,
    fontWeight: D.font.semibold,
  },
});
