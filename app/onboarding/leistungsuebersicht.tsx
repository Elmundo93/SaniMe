import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSpring,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { D } from '@sanime/design-system';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { Checkbox } from '../../components/ui/Checkbox';
import { BackLink } from '../../components/ui/BackLink';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { AGB_VERSION, DATENSCHUTZ_VERSION } from '../../constants/legal';

const PROZESS_SCHRITTE: { icon: React.ComponentProps<typeof Feather>['name']; label: string }[] = [
  { icon: 'camera', label: 'Rezept fotografieren' },
  { icon: 'shield', label: 'Krankenkassenkarte fotografieren' },
  { icon: 'activity', label: 'Versorgung auswählen' },
  { icon: 'calendar', label: 'Termin vereinbaren' },
  { icon: 'package', label: 'Status verfolgen' },
];

function ProzessVisual() {
  return (
    <View style={styles.card}>
      <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
      {PROZESS_SCHRITTE.map((schritt, i) => (
        <Animated.View
          key={schritt.label}
          entering={FadeInDown.delay(150 + i * 100).springify().damping(18)}
          style={styles.prozessRow}
        >
          <View style={styles.prozessIcon}>
            <Feather name={schritt.icon} size={16} color={D.color.gradientMid} />
          </View>
          <Text style={styles.prozessLabel}>{schritt.label}</Text>
          {i < PROZESS_SCHRITTE.length - 1 && <View style={styles.prozessLinie} />}
        </Animated.View>
      ))}
    </View>
  );
}

function SuccessRing() {
  const ring1 = useSharedValue(0.6);
  const check = useSharedValue(0);

  React.useEffect(() => {
    check.value = withDelay(200, withSpring(1, D.spring.bouncy));
    ring1.value = withDelay(400, withRepeat(withSpring(1.35, D.spring.breath), -1, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: ((1.35 - ring1.value) / 0.75) * 0.18,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.value }],
    opacity: check.value,
  }));

  return (
    <View style={styles.ringContainer}>
      <Animated.View style={[styles.outerRing, ring1Style]} />
      <Animated.View style={[styles.centerCircle, checkStyle]}>
        <LinearGradient colors={['rgba(52,199,89,0.3)', 'rgba(52,199,89,0.15)']} style={StyleSheet.absoluteFill} />
        <Feather name="check" size={32} color={D.color.success} />
      </Animated.View>
    </View>
  );
}

export default function LeistungsuebersichtScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('LEISTUNGSUEBERSICHT');
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const [substep, setSubstep] = useState<0 | 1 | 2>(0);

  if (!ready || !session) return <OnboardingLoadingView />;

  const agbAkzeptiert = session.consent.agb.akzeptiert;
  const datenschutzAkzeptiert = session.consent.datenschutz.akzeptiert;
  const beideAkzeptiert = agbAkzeptiert && datenschutzAkzeptiert;

  const handleZurück = () => {
    if (substep > 0) {
      setSubstep((s) => (s - 1) as 0 | 1 | 2);
    } else {
      router.back();
    }
  };

  const handleWeiter = async () => {
    if (substep < 2) {
      setSubstep((s) => (s + 1) as 0 | 1 | 2);
      return;
    }
    const result = await dispatch({ type: 'WEITER' });
    if (result.ok) {
      router.push('/scan/rezept');
    }
  };

  const weiterAktiv = substep < 2 || beideAkzeptiert;
  const weiterLabel = substep < 2 ? 'Weiter' : 'Weiter';

  return (
    <Screen
      backgroundColor={D.color.dark}
      statusBarStyle="light-content"
      edges={['top', 'bottom']}
      background={<LinearGradient colors={[D.color.dark, '#0A1630', '#0D1E3A']} style={StyleSheet.absoluteFill} />}
    >
        <View style={styles.header}>
          <BackLink onPress={handleZurück} variant="dark" />
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === substep && styles.dotActive]} />
            ))}
          </View>
        </View>

        <ScrollContainer contentContainerStyle={styles.content}>
          {substep === 0 && (
            <Animated.View key="substep-0" entering={FadeIn.duration(300)} style={styles.substep}>
              <View style={styles.visualArea}>
                <ProzessVisual />
              </View>
              <Animated.View entering={FadeInDown.delay(700).springify().damping(18)} style={styles.textBlock}>
                <Text style={styles.headline}>So läuft{'\n'}deine Versorgung.</Text>
                <Text style={styles.sub}>Fünf Schritte, kein Papierkram — wir begleiten dich durch den ganzen Prozess.</Text>
              </Animated.View>
            </Animated.View>
          )}

          {substep === 1 && (
            <Animated.View key="substep-1" entering={FadeIn.duration(300)} style={styles.substep}>
              <View style={styles.visualArea}>
                <SuccessRing />
              </View>
              <Animated.View entering={FadeInDown.delay(500).springify().damping(18)} style={styles.textBlock}>
                <Text style={styles.headline}>Wir kümmern{'\n'}uns.</Text>
                <Text style={styles.sub}>Krankenkasse, Unterlagen, Genehmigung — vollautomatisch. Du wirst benachrichtigt, sobald es Neuigkeiten gibt.</Text>
              </Animated.View>
            </Animated.View>
          )}

          {substep === 2 && (
            <Animated.View key="substep-2" entering={FadeIn.duration(300)} style={styles.substep}>
              <Animated.View entering={FadeInDown.delay(60).springify().damping(18)} style={styles.textBlock}>
                <Text style={styles.headline}>Fast geschafft.</Text>
                <Text style={styles.sub}>Bevor es losgeht, brauchen wir deine Einwilligung.</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).springify().damping(18)} style={styles.consentBlock}>
                <Checkbox
                  dark
                  checked={agbAkzeptiert}
                  onToggle={(next) => {
                    if (next) dispatch({ type: 'AGB_AKZEPTIERT', version: AGB_VERSION });
                  }}
                  label="Ich akzeptiere die AGB."
                />
                <TouchableOpacity onPress={() => router.push('/onboarding/agb')} hitSlop={8}>
                  <Text style={styles.link}>AGB anzeigen</Text>
                </TouchableOpacity>

                <Checkbox
                  dark
                  checked={datenschutzAkzeptiert}
                  onToggle={(next) => {
                    if (next) dispatch({ type: 'DATENSCHUTZ_AKZEPTIERT', version: DATENSCHUTZ_VERSION });
                  }}
                  label="Ich stimme der Verarbeitung meiner Gesundheitsdaten gemäß Art. 9 Abs. 2 lit. a DSGVO zu."
                />
                <TouchableOpacity onPress={() => router.push('/onboarding/datenschutz-text')} hitSlop={8}>
                  <Text style={styles.link}>Datenschutzerklärung anzeigen</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollContainer>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !weiterAktiv && styles.buttonDisabled]}
            onPress={handleWeiter}
            disabled={!weiterAktiv}
            activeOpacity={0.8}
          >
            {weiterAktiv && (
              <LinearGradient
                colors={[D.color.gradientTop, D.color.gradientBottom]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[styles.buttonLabel, !weiterAktiv && styles.buttonLabelDisabled]}>{weiterLabel}</Text>
          </TouchableOpacity>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 20, backgroundColor: D.color.gradientMid },
  content: { paddingHorizontal: 24, paddingTop: 8, gap: 24 },
  substep: { gap: 24 },
  visualArea: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  card: {
    width: '100%',
    borderRadius: D.radius.lg,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: D.color.darkBorder,
    backgroundColor: D.color.darkCard,
    gap: 4,
  },
  prozessRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  prozessIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(63,139,255,0.15)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  prozessLabel: { flex: 1, fontSize: D.font.md, fontWeight: D.font.medium, color: D.color.inkInverted },
  prozessLinie: { display: 'none' },
  ringContainer: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  outerRing: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 1.5, borderColor: D.color.success,
  },
  centerCircle: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(52,199,89,0.5)',
  },
  textBlock: { gap: 12 },
  headline: {
    fontSize: D.font.xxl + 4,
    fontWeight: D.font.heavy,
    color: D.color.inkInverted,
    letterSpacing: -0.8,
    lineHeight: (D.font.xxl + 4) * 1.12,
  },
  sub: { fontSize: D.font.md, color: 'rgba(255,255,255,0.55)', lineHeight: 22 },
  consentBlock: { gap: 10 },
  link: { fontSize: D.font.sm, color: D.color.gradientMid, fontWeight: D.font.semibold, marginLeft: 38, marginBottom: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  button: {
    height: 56, borderRadius: D.radius.lg,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  buttonDisabled: { backgroundColor: 'rgba(255,255,255,0.06)' },
  buttonLabel: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.inkInverted },
  buttonLabelDisabled: { color: 'rgba(255,255,255,0.25)' },
});
