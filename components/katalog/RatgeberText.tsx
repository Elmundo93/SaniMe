import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { D, typography } from '@sanime/design-system';

// Bewusst minimales Markdown für Ratgeber-Antworten: Absätze (Leerzeile) und
// „- “-Listen. Keine HTML-/WebView-Darstellung — redaktioneller Text bleibt Text.
export function RatgeberText({ text }: { text: string }) {
  const bloecke = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <View style={styles.wrap}>
      {bloecke.map((block, i) => {
        const zeilen = block.split('\n');
        const listenZeilen = zeilen.filter((z) => z.trim().startsWith('- '));
        const einleitung = zeilen.filter((z) => !z.trim().startsWith('- ')).join(' ');
        return (
          <View key={i} style={styles.block}>
            {!!einleitung && <Text style={styles.absatz}>{einleitung}</Text>}
            {listenZeilen.map((z, j) => (
              <View key={j} style={styles.listenZeile}>
                <Text style={styles.absatz} importantForAccessibility="no">•</Text>
                <Text style={[styles.absatz, styles.listenText]}>{z.trim().slice(2)}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  block: { gap: 6 },
  absatz: { ...typography.body, color: D.color.ink },
  listenZeile: { flexDirection: 'row', gap: 8 },
  listenText: { flex: 1 },
});
