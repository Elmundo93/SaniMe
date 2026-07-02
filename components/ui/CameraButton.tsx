import React, { useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useBreathing } from '../../hooks/useBreathing';
import { D } from '@sanime/design-system';

interface CameraButtonProps {
  onPress: () => void;
  size?: number;
}

export function CameraButton({ onPress, size = 72 }: CameraButtonProps) {
  const breathe = useBreathing(1.0, 1.055);
  const pressScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1400 }),
        withTiming(0.25, { duration: 1400 }),
      ),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value * pressScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.88, D.spring.snappy);
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, D.spring.bouncy);
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const radius = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      {/* Pulsierender Glow — liegt außerhalb des überflow-geclippten Kreises */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          glowStyle,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size * 0.75,
            top: -size * 0.25,
            left: -size * 0.25,
          },
        ]}
      />

      <Animated.View style={[{ width: size, height: size }, containerStyle]}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
          style={{ width: size, height: size }}
          accessibilityRole="button"
          accessibilityLabel="Rezept scannen"
        >
          <View style={[styles.container, D.shadow.fab, { width: size, height: size, borderRadius: radius }]}>
            <LinearGradient
              colors={[D.color.gradientTop, D.color.gradientBottom]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
            />

            {/* Lichtreflex oben rechts */}
            <View
              pointerEvents="none"
              style={[
                styles.reflex,
                {
                  top: size * 0.12,
                  right: size * 0.14,
                  width: size * 0.28,
                  height: size * 0.14,
                  borderRadius: size * 0.07,
                },
              ]}
            />

            <View style={styles.content}>
              <Text style={[styles.icon, { fontSize: size * 0.32 }]}>+</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    backgroundColor: D.color.accentGlow,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reflex: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-20deg' }],
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: '#FFFFFF',
    fontWeight: '200',
    lineHeight: undefined,
    includeFontPadding: false,
  },
});
