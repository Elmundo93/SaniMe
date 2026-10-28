import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { D, typography } from '@sanime/design-system';
import { einblenden } from '../../lib/einblenden';
import { GlassCard } from '../ui/GlassCard';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface KatalogKarteProps {
  icon?: string;
  titel: string;
  untertitel?: string;
  onPress: () => void;
  index?: number;
  accessibilityHint?: string;
}

// Gemeinsame Zeilenkarte für Kategorien, Bedarfe und Krankheitsbilder — ganze
// Karte tappbar, minHeight statt fester Höhe (Dynamic Type), Ziel 48 pt.
export function KatalogKarte({ icon, titel, untertitel, onPress, index = 0, accessibilityHint }: KatalogKarteProps) {
  // Große Schrift: Symbol weglassen, damit der Text die ganze Breite hat —
  // sonst brechen Produktnamen mitten im Wort um.
  const grosseSchrift = useWindowDimensions().fontScale >= 1.35;
  return (
    <Animated.View entering={einblenden(60 + Math.min(index, 8) * 40)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={untertitel ? `${titel}. ${untertitel}` : titel}
        accessibilityHint={accessibilityHint}
      >
        <GlassCard padding={14} radius={D.radius.lg}>
          <View style={styles.zeile}>
            {icon && !grosseSchrift && (
              <View style={styles.icon}>
                <Feather name={icon as FeatherName} size={22} color={D.color.accent} />
              </View>
            )}
            <View style={styles.text}>
              <Text style={styles.titel} maxFontSizeMultiplier={2}>
                {titel}
              </Text>
              {!!untertitel && <Text style={styles.untertitel}>{untertitel}</Text>}
            </View>
            <Feather name="chevron-right" size={20} color={D.color.inkTertiary} />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function AbschnittTitel({ titel, aktion }: { titel: string; aktion?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.abschnitt}>
      <Text style={styles.abschnittTitel} accessibilityRole="header" maxFontSizeMultiplier={1.6}>
        {titel}
      </Text>
      {aktion && (
        <TouchableOpacity onPress={aktion.onPress} style={styles.abschnittAktion} accessibilityRole="button">
          <Text style={styles.abschnittAktionText}>{aktion.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function KatalogLaden() {
  return (
    <View style={styles.mittig} accessible accessibilityLabel="Wird geladen">
      <ActivityIndicator color={D.color.accent} />
    </View>
  );
}

export function KatalogHinweis({
  icon,
  text,
  aktion,
}: {
  icon: FeatherName;
  text: string;
  aktion?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.mittig}>
      <Feather name={icon} size={24} color={D.color.inkTertiary} />
      <Text style={styles.hinweis}>{text}</Text>
      {aktion && (
        <TouchableOpacity onPress={aktion.onPress} style={styles.abschnittAktion} accessibilityRole="button">
          <Text style={styles.abschnittAktionText}>{aktion.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const KATALOG_LADEFEHLER =
  'Der Katalog konnte nicht geladen werden. Bitte überprüfe deine Internetverbindung und versuche es erneut.';

const styles = StyleSheet.create({
  zeile: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 },
  icon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: D.color.accentLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  text: { flex: 1, gap: 2 },
  titel: { ...typography.body, fontWeight: D.font.bold, color: D.color.ink },
  untertitel: { ...typography.caption, color: D.color.inkSecondary },
  abschnitt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  abschnittTitel: { ...typography.headline, color: D.color.ink, flex: 1 },
  abschnittAktion: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  abschnittAktionText: { ...typography.body, fontWeight: D.font.semibold, color: D.color.accent },
  mittig: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 32 },
  hinweis: { ...typography.body, color: D.color.inkSecondary, textAlign: 'center', paddingHorizontal: 16 },
});
