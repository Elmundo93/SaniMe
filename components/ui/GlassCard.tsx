import React from 'react';
import { View, StyleSheet, Platform, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { D } from '../../constants/design';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  padding?: number;
  radius?: number;
  tint?: 'light' | 'extraLight' | 'dark';
  noShadow?: boolean;
}

export function GlassCard({
  intensity = 55,
  padding = 20,
  radius = D.radius.lg,
  tint = 'light',
  noShadow = false,
  style,
  children,
  ...rest
}: GlassCardProps) {
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
        !noShadow && D.shadow.card,
        style,
      ]}
      {...rest}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={intensity}
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
            backgroundColor: D.color.glassBlue,
            borderWidth: 0.5,
            borderColor: D.color.glassBorder,
          },
        ]}
        pointerEvents="none"
      />

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
});
