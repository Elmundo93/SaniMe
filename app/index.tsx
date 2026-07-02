import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore, STATUS_META } from '../store/onboardingStore';
import { D } from '../constants/design';

function SplashView() {
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, D.spring.bouncy);
    logoOpacity.value = withTiming(1, { duration: 400 });
    taglineOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.splash}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[D.color.gradientTop, D.color.gradientMid, D.color.gradientBottom]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.splashInner}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>S</Text>
          </View>
        </Animated.View>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          {'Deine Versorgung.\nEinfach. Schnell. SaniMe.'}
        </Animated.Text>
      </SafeAreaView>
    </View>
  );
}

export default function Index() {
  const [splashDone, setSplashDone] = React.useState(false);
  const onboardingAbgeschlossen = useAuthStore((s) => s.onboardingAbgeschlossen);
  const session = useOnboardingStore((s) => s.session);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!splashDone) {
    return <SplashView />;
  }

  if (!onboardingAbgeschlossen) {
    if (session && session.status !== 'ABGESCHLOSSEN') {
      return <Redirect href={STATUS_META[session.status].route as any} />;
    }
    return <Redirect href="/onboarding" />;
  }

  // Kein benutzer (ausgeloggt oder noch nie erkannt) landet auf dem Dashboard statt
  // einem Login-Zwang — der leere Zustand dort fordert zum Scannen auf, und ein
  // Krankenkassenkarten-Scan kann die Identität per Archiv-Abgleich wiederherstellen
  // (siehe lib/mockKundenArchiv.ts).
  return <Redirect href="/(app)/dashboard" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: D.color.gradientTop,
  },
  splashInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: D.font.lg,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: D.font.medium,
    letterSpacing: 0.1,
  },
});
