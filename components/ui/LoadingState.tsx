import React from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { D } from '@sanime/design-system';

interface LoadingStateProps {
  title: string;
  subtitle?: string;
  steps?: string[];
}

export function LoadingState({ title, subtitle, steps }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator color="#FFFFFF" size="large" />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {steps && steps.length > 0 && (
        <View style={styles.steps}>
          {steps.map((s) => (
            <View key={s} style={styles.step}>
              <ActivityIndicator color={D.color.accent} size="small" />
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: D.color.dark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  steps: { marginTop: 24, gap: 14, width: '100%', maxWidth: 260 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
});
