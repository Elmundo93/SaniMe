import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { D, durations } from '@sanime/design-system';
import { GlassCard } from './GlassCard';

interface SectionProps {
  titel: string;
  aktionLabel?: string;
  onAktion?: () => void;
  /** Slot rechts im Header, z.B. ein Vollständigkeits-Badge — unabhängig von `collapsible` nutzbar. */
  headerRight?: React.ReactNode;
  /** Macht den Header antippbar zum Ein-/Ausklappen der Children. Default false — bestehende Aufrufer unbetroffen. */
  collapsible?: boolean;
  defaultExpanded?: boolean;
  /** Basis-Text für den a11y-Label des Headers (z.B. "Profil, 2 Angaben fehlen"), nur bei collapsible relevant. Fällt auf `titel` zurück. */
  headerAccessibilityLabel?: string;
  padding?: number;
  children: React.ReactNode;
}

/** Titel + optionaler Aktions-Link über einer GlassCard — konsolidiert die bisher
 * getrennt implementierten "Section" (Zusammenfassung) und "SettingsGruppe" (Einstellungen). */
export function Section({
  titel,
  aktionLabel,
  onAktion,
  headerRight,
  collapsible = false,
  defaultExpanded = true,
  headerAccessibilityLabel,
  padding = 0,
  children,
}: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const chevronRotation = useSharedValue(defaultExpanded ? 1 : 0);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    chevronRotation.value = withTiming(next ? 1 : 0, { duration: durations.fast });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 180}deg` }],
  }));

  const headerInner = (
    <>
      <Text style={styles.titel} numberOfLines={1}>{titel}</Text>
      <View style={styles.headerRightRow}>
        {headerRight}
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
        {collapsible && (
          <Animated.View style={chevronStyle}>
            <Feather name="chevron-down" size={18} color={D.color.inkTertiary} />
          </Animated.View>
        )}
      </View>
    </>
  );

  return (
    <Animated.View style={styles.container} layout={LinearTransition.duration(durations.fast)}>
      {collapsible ? (
        <TouchableOpacity
          style={[styles.header, styles.headerCollapsible]}
          onPress={toggleExpanded}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${headerAccessibilityLabel ?? titel}, ${expanded ? 'ausgeklappt' : 'eingeklappt'}`}
        >
          {headerInner}
        </TouchableOpacity>
      ) : (
        <View style={styles.header}>{headerInner}</View>
      )}
      {(!collapsible || expanded) && (
        <Animated.View entering={FadeIn.duration(durations.fast)} exiting={FadeOut.duration(durations.fast)}>
          <GlassCard padding={padding} radius={D.radius.md}>
            {children}
          </GlassCard>
        </Animated.View>
      )}
    </Animated.View>
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
  headerCollapsible: {
    minHeight: 44,
    paddingRight: 4,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
