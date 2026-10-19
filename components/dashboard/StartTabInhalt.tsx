import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { D } from '@sanime/design-system';
import { GlassCard } from '../ui/GlassCard';
import { ScrollContainer } from '../ui/ScrollContainer';
import { einblenden } from '../../lib/einblenden';

/** Scroll-Hülle eines Start-Tabs — inkl. Abstand für den schwebenden Kamera-Button
 * (`fabAbstand={false}` für Inhalte ohne Kamera-Button, z. B. das Aufgaben-Modal). */
export function StartTabScroll({ children, fabAbstand = true }: { children: React.ReactNode; fabAbstand?: boolean }) {
  return (
    <ScrollContainer contentContainerStyle={styles.scrollContent}>
      {children}
      <View style={fabAbstand ? styles.fabAbstand : styles.endAbstand} />
    </ScrollContainer>
  );
}

export function LadeSkelett() {
  return (
    <View style={styles.skelettBlock} accessibilityLabel="Wird geladen" accessible>
      <View style={styles.skelett} />
      <View style={[styles.skelett, styles.skelettKlein]} />
    </View>
  );
}

interface LeerHinweisProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  titel: string;
  text: string;
  children?: React.ReactNode;
}

export function LeerHinweis({ icon, titel, text, children }: LeerHinweisProps) {
  return (
    <Animated.View entering={einblenden(60)}>
      <GlassCard style={styles.leerKarte} padding={36} radius={D.radius.xl}>
        <View style={styles.leerIcon}>
          <Feather name={icon} size={28} color={D.color.accent} />
        </View>
        <Text style={styles.leerTitel}>{titel}</Text>
        <Text style={styles.leerText}>{text}</Text>
        {children}
      </GlassCard>
    </Animated.View>
  );
}

export const startTabStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: D.font.bold,
    color: D.color.inkTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  punkt: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  zeileInhalt: {
    flex: 1,
  },
  zeileTitel: {
    fontSize: D.font.md,
    fontWeight: D.font.semibold,
    color: D.color.ink,
  },
  zeileMeta: {
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 12,
    gap: 14,
  },
  fabAbstand: {
    height: 140,
  },
  endAbstand: {
    height: 40,
  },
  skelettBlock: {
    gap: 12,
  },
  skelett: {
    height: 240,
    borderRadius: D.radius.xl,
    backgroundColor: 'rgba(63,139,255,0.07)',
  },
  skelettKlein: {
    height: 180,
  },
  leerKarte: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  leerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: D.color.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  leerTitel: {
    fontSize: D.font.xl,
    fontWeight: D.font.heavy,
    color: D.color.ink,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  leerText: {
    fontSize: D.font.md,
    color: D.color.inkSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
