import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { D } from '@sanime/design-system';

/** Wort-Bild-Marke für den App-Header: dieselbe „S“-Kachel wie auf dem Splash-Screen,
 * hier auf Akzent-Verlauf statt auf weißem Glas, plus Schriftzug. Platzhalter, bis ein
 * finales Logo-Asset existiert (assets/ enthält noch keins). */
export function SaniMeLogo() {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="header"
      accessibilityLabel="SaniMe"
    >
      <View style={styles.mark}>
        <LinearGradient
          colors={[D.color.gradientTop, D.color.gradientBottom]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.markText} maxFontSizeMultiplier={1.2}>S</Text>
      </View>
      <Text style={styles.wordmark} maxFontSizeMultiplier={1.3}>
        Sani<Text style={styles.wordmarkAkzent}>Me</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 17,
    fontWeight: D.font.black,
    color: D.color.inkInverted,
    letterSpacing: -0.5,
  },
  wordmark: {
    fontSize: D.font.xl,
    fontWeight: D.font.heavy,
    color: D.color.ink,
    letterSpacing: -0.6,
  },
  wordmarkAkzent: {
    color: D.color.accent,
  },
});
