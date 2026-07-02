import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface HeroGlowProps {
  height?: number;
}

/** Radialer Hintergrund-Glow am oberen Bildschirmrand — konsolidiert die bisher 3x
 * duplizierte, mit leicht abweichenden Werten kopierte Umsetzung (dashboard/index,
 * einstellungen, dashboard/[id]). Nutzt dabei die aktuelle Palette (primary.sky) statt
 * des dort noch hartcodierten Vor-Redesign-Blaus aus rgba(123,201,255,...). */
export function HeroGlow({ height = 300 }: HeroGlowProps) {
  return (
    <View style={[styles.glow, { height }]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(127,194,255,0.16)', 'rgba(245,248,252,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
});
