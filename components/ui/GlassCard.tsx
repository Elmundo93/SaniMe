import React from 'react';
import { View, StyleSheet, Platform, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { D, glass, blur } from '@sanime/design-system';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  padding?: number;
  radius?: number;
  tint?: 'light' | 'extraLight' | 'dark';
  noShadow?: boolean;
  /** Wählt eines der 5 Glass-Material-Tiers aus @sanime/design-system statt Einzelwerten. */
  tier?: keyof typeof glass;
}

export function GlassCard({
  intensity,
  padding = 20,
  radius = D.radius.lg,
  tint = 'light',
  noShadow = false,
  tier,
  style,
  children,
  ...rest
}: GlassCardProps) {
  const preset = tier ? glass[tier] : undefined;
  const effectiveIntensity = intensity ?? preset?.blur ?? blur.lg;
  const effectiveShadow = preset?.shadow ?? D.shadow.card;
  const effectiveOverlay = preset?.tint ?? D.color.glassBlue;
  const effectiveBorder = preset?.border ?? D.color.glassBorder;

  const inner = (
    <View
      style={[
        styles.inner,
        {
          padding,
          borderRadius: radius,
          backgroundColor: Platform.OS === 'android'
            ? 'rgba(255,255,255,0.88)'
            : D.color.glassBase,
        },
      ]}
    >
      {children}
    </View>
  );

  return (
    <View
      style={[
        styles.outer,
        { borderRadius: radius },
        !noShadow && effectiveShadow,
        style,
      ]}
      {...rest}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={effectiveIntensity}
          tint={tint}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : null}

      {/* Blue glow tint + white glass layer */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            backgroundColor: effectiveOverlay,
            borderWidth: 0.5,
            borderColor: effectiveBorder,
          },
        ]}
        pointerEvents="none"
      />

      {/* Glass-Reflection-Highlight des gewählten Tiers (glass.ts) — nur bei explizitem
          tier, damit bestehende Aufrufstellen ohne tier optisch unverändert bleiben. */}
      {Platform.OS === 'ios' && preset?.reflection && (
        <View
          pointerEvents="none"
          style={[styles.reflection, { backgroundColor: preset.reflection }]}
        />
      )}

      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
    position: 'relative',
  },
  inner: {
    overflow: 'hidden',
  },
  reflection: {
    position: 'absolute',
    top: -10,
    left: -20,
    right: -20,
    height: 28,
    transform: [{ rotate: '-6deg' }],
  },
});
