import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useBreathing } from '../../hooks/useBreathing';
import { D } from '../../constants/design';

interface CameraButtonProps {
  onPress: () => void;
  size?: number;
}

export function CameraButton({ onPress, size = 74 }: CameraButtonProps) {
  const scale = useBreathing(1.0, 1.055);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const radius = size / 2;

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      <TouchableOpacity
        onPress={handlePress}
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
  );
}

const styles = StyleSheet.create({
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
