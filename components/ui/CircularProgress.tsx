import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import { D } from '@sanime/design-system';

const SEGMENTS = 36;

interface SegmentProps {
  index: number;
  total: number;
  size: number;
  strokeWidth: number;
  progress: SharedValue<number>;
}

function Segment({ index, total, size, strokeWidth, progress }: SegmentProps) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2 + radius * Math.cos(angle);
  const cy = size / 2 + radius * Math.sin(angle);
  const segW = 2.5;
  const segH = strokeWidth * 0.65;
  const threshold = index / total;

  const style = useAnimatedStyle(() => ({
    backgroundColor:
      progress.value >= threshold ? D.color.accent : 'rgba(63,139,255,0.13)',
    opacity: progress.value >= threshold ? 1 : 1,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: segW,
          height: segH,
          borderRadius: segW / 2,
          left: cx - segW / 2,
          top: cy - segH / 2,
          transform: [{ rotate: `${angle + Math.PI / 2}rad` }],
        },
        style,
      ]}
    />
  );
}

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  statusLabel: string;
  subtitle?: string;
}

export function CircularProgress({
  value,
  size = 160,
  strokeWidth = 14,
  statusLabel,
  subtitle,
}: CircularProgressProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(600, withSpring(value, D.spring.gentle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <Segment
          key={i}
          index={i}
          total={SEGMENTS}
          size={size}
          strokeWidth={strokeWidth}
          progress={progress}
        />
      ))}

      {/* Center text */}
      <View style={[styles.center, { borderRadius: size / 2 }]}>
        <Text style={styles.statusLabel} numberOfLines={2} adjustsFontSizeToFit>
          {statusLabel}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 28,
    left: 28,
    right: 28,
    bottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: D.font.sm,
    fontWeight: D.font.bold,
    color: D.color.ink,
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: D.font.sm * 1.3,
  },
  subtitle: {
    fontSize: D.font.xs,
    color: D.color.inkTertiary,
    textAlign: 'center',
    lineHeight: D.font.xs * 1.4,
    fontWeight: D.font.regular,
  },
});
