import { useEffect } from 'react';
import { useSharedValue, withRepeat, withSequence, withSpring } from 'react-native-reanimated';
import { D } from '../constants/design';

export function useBreathing(
  min = 1.0,
  max = 1.055,
  config = D.spring.breath,
) {
  const scale = useSharedValue(min);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(max, config),
        withSpring(min, config),
      ),
      -1,
      false,
    );
  }, []);

  return scale;
}
