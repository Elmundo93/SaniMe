import React, { useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { D } from '@sanime/design-system';

interface MicButtonProps {
  hoertZu: boolean;
  onPress: () => void;
  size?: number;
}

// Gleiche visuelle Sprache wie CameraButton — hier als sekundäre Aktion neben
// dem Suchfeld auf krankheitsbild.tsx, ersetzt es nie, siehe dortige Nutzung.
export function MicButton({ hoertZu, onPress, size = 56 }: MicButtonProps) {
  const breathe = useSharedValue(1);
  const glowOpacity = useSharedValue(0.25);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (hoertZu) {
      breathe.value = withRepeat(withSequence(withTiming(1.08, { duration: 500 }), withTiming(1, { duration: 500 })), -1, true);
      glowOpacity.value = withRepeat(withSequence(withTiming(0.6, { duration: 500 }), withTiming(0.25, { duration: 500 })), -1, true);
    } else {
      breathe.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [hoertZu, breathe, glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value * pressScale.value }] }));

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const handlePressIn = () => {
    pressScale.value = withSpring(0.9, D.spring.snappy);
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, D.spring.bouncy);
  };

  const radius = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          glowStyle,
          { width: size * 1.5, height: size * 1.5, borderRadius: size * 0.75, top: -size * 0.25, left: -size * 0.25 },
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
          accessibilityLabel={hoertZu ? 'Spracheingabe beenden' : 'Krankheitsbild per Sprache beschreiben'}
        >
          <View
            style={[
              styles.container,
              { width: size, height: size, borderRadius: radius, backgroundColor: hoertZu ? D.color.error : D.color.accent },
            ]}
          >
            <Feather name={hoertZu ? 'square' : 'mic'} size={size * 0.4} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', backgroundColor: D.color.accentGlow },
  container: { alignItems: 'center', justifyContent: 'center' },
});
