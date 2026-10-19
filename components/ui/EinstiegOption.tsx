import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { einblenden } from '../../lib/einblenden';
import { D } from '@sanime/design-system';
import { GlassCard } from './GlassCard';

interface EinstiegOptionProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  titel: string;
  beschreibung: string;
  onPress: () => void;
  index: number;
}

// Große, gut lesbare Auswahlkachel für app/einstieg — bewusst groß und mit
// viel Weißraum statt kompakter Liste, siehe CLAUDE.md's Vorgabe für die
// überwiegend ältere Zielgruppe (44×44 reicht als Mindest-Touch-Target nicht,
// die ganze Karte ist tappbar).
export function EinstiegOption({ icon, titel, beschreibung, onPress, index }: EinstiegOptionProps) {
  return (
    <Animated.View entering={einblenden(100 + index * 90)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={titel}
        accessibilityHint={beschreibung}
      >
        <GlassCard padding={20} radius={D.radius.lg}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Feather name={icon} size={24} color={D.color.accent} />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.titel}>{titel}</Text>
              <Text style={styles.beschreibung}>{beschreibung}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={D.color.inkTertiary} />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: D.color.accentLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  textBlock: { flex: 1, gap: 3 },
  titel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.ink },
  beschreibung: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19 },
});
