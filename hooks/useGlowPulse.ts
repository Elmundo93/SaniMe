import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Sanft pulsierende Opacity — für den "Live Glow" des Scan-Rahmens. */
export function useGlowPulse(min = 0.55, max = 1, duration = 900) {
  const opacity = useSharedValue(min);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(max, { duration }),
        withTiming(min, { duration }),
      ),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
