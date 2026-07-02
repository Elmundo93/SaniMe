import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { D } from '@sanime/design-system';

interface StepCounterProps {
  aktuellerSchritt: number;
  gesamtSchritte: number;
  label?: string;
  variant?: 'dark' | 'light';
}

// Ersetzt hartcodierten "Schritt X von Y"-Text in den Scan-/Onboarding-Screens.
// variant="dark" für Kamera-/Onboarding-Hintergründe, "light" für helle Screen-Header.
export function StepCounter({ aktuellerSchritt, gesamtSchritte, label, variant = 'dark' }: StepCounterProps) {
  const text = label ?? `Schritt ${aktuellerSchritt} von ${gesamtSchritte}`;
  return (
    <View
      style={[styles.pill, variant === 'light' && styles.pillLight]}
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <Text style={[styles.text, variant === 'light' && styles.textLight]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillLight: { backgroundColor: D.color.accentLight },
  text: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  textLight: { color: D.color.accent },
});
