import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Eigener Provider wie in app/scan/_layout.tsx: im fullScreenModal maß die
// SafeAreaView sonst einen oberen Abstand von 0.
export default function EinstiegLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
