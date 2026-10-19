import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { D, typography } from '@sanime/design-system';
import type { Produkt } from '@sanime/domain';
import { einblenden } from '../../lib/einblenden';
import { istBestellbar, kostenhinweis, produktA11yLabel, verfuegbarkeitText } from '../../lib/katalogAnzeige';
import { GlassCard } from '../ui/GlassCard';

interface KatalogProduktKarteProps {
  produkt: Produkt;
  onPress: () => void;
  index?: number;
}

type FeatherName = React.ComponentProps<typeof Feather>['name'];

// Katalog-Gegenstück zu ProduktKarte (die bleibt für die Auswahl auf
// VERSORGUNGSAUSWAHL, mit Auswahlkreis und HiMi-Nr.). Hier Progressive
// Disclosure: Nutzen, Kostenhinweis, Verfügbarkeit — technische Daten erst auf
// der Detailseite. Die ganze Karte ist ein Touch-Target, die einzige
// Primär-CTA („In den Warenkorb“) steht auf der Detailseite.
export function KatalogProduktKarte({ produkt, onPress, index = 0 }: KatalogProduktKarteProps) {
  const kosten = kostenhinweis(produkt);
  const bestellbar = istBestellbar(produkt);
  return (
    <Animated.View entering={einblenden(60 + Math.min(index, 8) * 50)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={produktA11yLabel(produkt)}
        accessibilityHint="Öffnet die Produktdetails"
      >
        <GlassCard padding={16} radius={D.radius.lg}>
          <View style={styles.zeile}>
            {/* Kategorie-Icon als Platzhalter, bis lizenzierte Herstellerbilder vorliegen. */}
            <View style={styles.bild}>
              <Feather name={(produkt.kategorieIcon ?? 'package') as FeatherName} size={26} color={D.color.accent} />
            </View>
            <View style={styles.inhalt}>
              <Text style={styles.name}>{produkt.name}</Text>
              <Text style={styles.nutzen}>{produkt.kurzbeschreibung ?? produkt.beschreibung}</Text>
              <Text style={styles.kosten}>{kosten.titel}</Text>
              <View style={styles.verfuegbarkeit}>
                <Feather
                  name={bestellbar ? 'truck' : 'slash'}
                  size={14}
                  color={bestellbar ? D.color.inkSecondary : D.color.error}
                />
                <Text style={[styles.verfuegbarkeitText, !bestellbar && styles.nichtBestellbar]}>
                  {verfuegbarkeitText(produkt)}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={D.color.inkTertiary} />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  zeile: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  bild: {
    width: 64, height: 64, borderRadius: D.radius.md,
    backgroundColor: D.color.accentLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  inhalt: { flex: 1, gap: 4 },
  name: { ...typography.body, fontWeight: D.font.bold, color: D.color.ink },
  nutzen: { ...typography.body, color: D.color.inkSecondary },
  kosten: { ...typography.caption, fontWeight: D.font.semibold, color: D.color.accent },
  verfuegbarkeit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verfuegbarkeitText: { ...typography.caption, color: D.color.inkSecondary },
  nichtBestellbar: { color: D.color.error, fontWeight: D.font.semibold },
});
