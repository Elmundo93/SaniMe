import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { D } from '../../constants/design';
import { useOnboardingStore } from '../../store/onboardingStore';

const { width } = Dimensions.get('window');

// Einzelnes Partikel-Element
function Particle({
  angle,
  distance,
  size,
  delay,
  color,
  progress,
}: {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  color: string;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (progress.value - delay) / (1 - delay)));
    const opacity = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
    return {
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p },
      ],
      opacity: Math.max(0, opacity),
    };
  });

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const PARTICLES = [
  { angle: -Math.PI / 4,     distance: 80,  size: 6, delay: 0.0, color: D.color.gradientTop },
  { angle: -Math.PI / 2,     distance: 100, size: 4, delay: 0.05, color: D.color.gradientMid },
  { angle: -Math.PI * 0.7,   distance: 70,  size: 8, delay: 0.08, color: '#B8E4FF' },
  { angle: 0,                distance: 90,  size: 5, delay: 0.03, color: D.color.gradientBottom },
  { angle: Math.PI / 6,      distance: 110, size: 4, delay: 0.1,  color: D.color.gradientTop },
  { angle: Math.PI / 3,      distance: 75,  size: 6, delay: 0.06, color: D.color.gradientMid },
  { angle: Math.PI / 2,      distance: 95,  size: 5, delay: 0.02, color: '#D6F0FF' },
  { angle: Math.PI * 0.75,   distance: 85,  size: 7, delay: 0.09, color: D.color.gradientBottom },
  { angle: Math.PI,          distance: 100, size: 4, delay: 0.04, color: D.color.gradientTop },
  { angle: -Math.PI * 0.85,  distance: 65,  size: 5, delay: 0.07, color: '#B8E4FF' },
];

export default function OnboardingScreen1() {
  const router = useRouter();
  const starten = useOnboardingStore((s) => s.starten);
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const particleProgress = useSharedValue(0);
  const docOpacity = useSharedValue(1);
  const docScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.6);

  useEffect(() => {
    // Dokument dissolved nach 800ms
    docOpacity.value = withDelay(800, withTiming(0, { duration: 700 }));
    docScale.value = withDelay(800, withTiming(0.3, { duration: 700 }));

    // Partikel fliegen ab 800ms
    particleProgress.value = withDelay(800, withTiming(1, { duration: 1100 }));

    // Logo erscheint ab 1200ms
    logoOpacity.value = withDelay(1200, withSpring(1, D.spring.gentle));
    logoScale.value = withDelay(1200, withSpring(1, D.spring.bouncy));
  }, []);

  const docStyle = useAnimatedStyle(() => ({
    opacity: docOpacity.value,
    transform: [{ scale: docScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[D.color.dark, '#0A1630', '#0D1E3A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtiler blauer Glow im Hintergrund */}
      <View style={styles.glowCircle} pointerEvents="none">
        <LinearGradient
          colors={['rgba(91,174,255,0.22)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Visual-Bereich: Partikel + Dokument + Logo */}
        <View style={styles.visualArea}>
          {/* Partikel */}
          <View style={styles.particleOrigin} pointerEvents="none">
            {PARTICLES.map((p, i) => (
              <Particle key={i} {...p} progress={particleProgress} />
            ))}
          </View>

          {/* Dokument */}
          <Animated.View style={[styles.docWrapper, docStyle]}>
            <View style={styles.docCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.03)']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.docIcon}>📋</Text>
              <View style={styles.docLines}>
                <View style={styles.docLine} />
                <View style={[styles.docLine, { width: '70%' }]} />
                <View style={[styles.docLine, { width: '85%' }]} />
              </View>
            </View>
          </Animated.View>

          {/* Logo (erscheint nach Auflösung) */}
          <Animated.View style={[styles.logoWrapper, logoStyle]} pointerEvents="none">
            <View style={styles.logoMark}>
              <LinearGradient
                colors={[D.color.gradientTop, D.color.gradientBottom]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.logoMarkText}>✦</Text>
            </View>
          </Animated.View>
        </View>

        {/* Text-Bereich */}
        <Animated.View entering={FadeInDown.delay(1600).springify().damping(18)} style={styles.textArea}>
          <Text style={styles.headline}>Scanne dein Rezept.</Text>
          <Text style={styles.sub}>
            Den Rest übernimmt SaniMe. Krankenkasse,
            Genehmigung, Lieferung — alles automatisch.
          </Text>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeIn.delay(2000).duration(600)} style={styles.footer}>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await starten();
              await dispatch({ type: 'WEITER' });
              router.push('/onboarding/leistungsuebersicht');
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[D.color.gradientTop, D.color.gradientBottom]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.buttonLabel}>Weiter</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: D.color.dark,
  },
  glowCircle: {
    position: 'absolute',
    top: -100, left: '50%', marginLeft: -200,
    width: 400, height: 400,
    borderRadius: 200,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
  },
  visualArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleOrigin: {
    position: 'absolute',
    width: 1,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCard: {
    width: 130,
    height: 170,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: D.color.darkBorder,
    backgroundColor: D.color.darkCard,
    gap: 12,
  },
  docIcon: {
    fontSize: 44,
  },
  docLines: {
    width: '72%',
    gap: 6,
  },
  docLine: {
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
  },
  logoWrapper: {
    position: 'absolute',
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoMarkText: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  textArea: {
    paddingBottom: 32,
    gap: 14,
  },
  headline: {
    fontSize: D.font.giant,
    fontWeight: D.font.heavy,
    color: D.color.inkInverted,
    letterSpacing: -1.5,
    lineHeight: D.font.giant * 1.05,
    textWrap: 'balance',
  } as object,
  sub: {
    fontSize: D.font.lg,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 26,
    fontWeight: D.font.regular,
  },
  footer: {
    paddingBottom: 20,
    gap: 20,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: D.color.gradientMid,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: D.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: {
    fontSize: D.font.lg,
    fontWeight: D.font.bold,
    color: D.color.inkInverted,
    letterSpacing: 0.2,
  },
});
