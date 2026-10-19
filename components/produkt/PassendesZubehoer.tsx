import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { D, typography } from '@sanime/design-system';
import type { PassendeProdukte, Produkt, ProduktBeziehung } from '@sanime/domain';
import { KatalogProduktKarte } from './KatalogProduktKarte';

const GRUPPEN: { art: ProduktBeziehung; titel: string }[] = [
  { art: 'zubehoer', titel: 'Zubehör' },
  { art: 'ersatzteil', titel: 'Ersatzteile' },
  { art: 'dienstleistung', titel: 'Dienstleistungen' },
];

interface PassendesZubehoerProps {
  passende: PassendeProdukte;
  onProdukt: (produkt: Produkt) => void;
}

// Komplementärketten, gruppiert. Die Kompatibilität (inkl. Ausführung) prüft der
// Server — hier erscheint nur, was zum Produkt bzw. zur gewählten Ausführung passt.
// Leere Gruppen werden ausgelassen, nicht leer gezeigt.
export function PassendesZubehoer({ passende, onProdukt }: PassendesZubehoerProps) {
  return (
    <View style={styles.wrap}>
      {GRUPPEN.filter((g) => passende[g.art].length > 0).map((g) => (
        <View key={g.art} style={styles.gruppe}>
          <Text style={styles.gruppenTitel} accessibilityRole="header">
            {g.titel}
          </Text>
          {passende[g.art].map((p, i) => (
            <KatalogProduktKarte key={p.id} produkt={p} index={i} onPress={() => onProdukt(p)} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function hatPassende(passende: PassendeProdukte | null): passende is PassendeProdukte {
  return !!passende && GRUPPEN.some((g) => passende[g.art].length > 0);
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  gruppe: { gap: 10 },
  gruppenTitel: { ...typography.caption, fontWeight: D.font.bold, color: D.color.inkSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
});
