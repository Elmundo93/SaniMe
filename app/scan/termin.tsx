import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '../../components/ui/GlassCard';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { MiniKalender } from '../../components/onboarding/MiniKalender';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { generiereTerminVorschlaege, terminAusKalenderdatum } from '../../lib/terminplanung';
import { D } from '../../constants/design';
import type { TerminSlot } from '../../types';

function formatTermin(slot: TerminSlot) {
  const beginn = new Date(slot.beginn);
  const ende = new Date(slot.ende);
  const tag = beginn.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
  const zeit = `${beginn.getHours().toString().padStart(2, '0')}:00 – ${ende.getHours().toString().padStart(2, '0')}:00 Uhr`;
  return { tag, zeit };
}

export default function TerminplanungScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('TERMINPLANUNG');
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const [ausgewähltId, setAusgewähltId] = useState<string | null>(null);
  const [zeigeKalender, setZeigeKalender] = useState(false);

  useEffect(() => {
    if (session && session.terminVorschläge.length === 0) {
      const vorschläge = generiereTerminVorschlaege(session);
      dispatch({ type: 'TERMIN_VORSCHLAEGE_BERECHNET', vorschläge });
    }
  }, [session?.id, session?.terminVorschläge.length]);

  if (!ready || !session) return <OnboardingLoadingView />;

  const handleZurück = async () => {
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) router.replace(STATUS_META[result.session.status].route as any);
  };

  const bestätigen = async (termin: TerminSlot) => {
    const result = await dispatch({ type: 'TERMIN_AUSGEWAEHLT', termin });
    if (result.ok) router.push(STATUS_META[result.session.status].route as any);
  };

  const handleWeiter = async () => {
    const termin = session.terminVorschläge.find((t) => t.id === ausgewähltId);
    if (!termin) return;
    await bestätigen(termin);
  };

  const handleKalenderAuswahl = async (datum: Date) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await bestätigen(terminAusKalenderdatum(session, datum));
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleZurück} hitSlop={12} style={styles.zurückBtn} accessibilityLabel="Zurück">
            <Text style={styles.zurückIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitel}>Termin wählen</Text>
          <StepCounter
            aktuellerSchritt={STATUS_META.TERMINPLANUNG.schritt}
            gesamtSchritte={11}
            variant="light"
            label={`${STATUS_META.TERMINPLANUNG.schritt}/11`}
          />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <Text style={styles.hinweis}>
              Wir haben passende Termine für deine Lieferung berechnet — basierend auf Bearbeitungsdauer, Lieferzeit und Verfügbarkeit.
            </Text>
          </Animated.View>

          {!zeigeKalender && session.terminVorschläge.map((termin, i) => {
            const { tag, zeit } = formatTermin(termin);
            const ausgewählt = termin.id === ausgewähltId;
            return (
              <Animated.View key={termin.id} entering={FadeInDown.delay(100 + i * 80).springify().damping(18)}>
                <TouchableOpacity
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setAusgewähltId(termin.id);
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ausgewählt }}
                  accessibilityLabel={`${tag}, ${zeit}${termin.hinweis ? ', ' + termin.hinweis : ''}`}
                >
                  <GlassCard padding={16} radius={D.radius.md} style={ausgewählt ? styles.cardAktiv : undefined}>
                    <View style={styles.terminRow}>
                      <View style={{ flex: 1 }}>
                        {termin.hinweis && <Text style={styles.terminHinweis}>{termin.hinweis}</Text>}
                        <Text style={styles.terminTag}>{tag}</Text>
                        <Text style={styles.terminZeit}>{zeit}</Text>
                      </View>
                      <View style={[styles.auswahlKreis, ausgewählt && styles.auswahlKreisAktiv]}>
                        {ausgewählt && <Text style={styles.auswahlCheck}>✓</Text>}
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          <Animated.View entering={FadeInDown.delay(420).springify()}>
            <TouchableOpacity
              onPress={() => setZeigeKalender((v) => !v)}
              style={styles.kalenderToggle}
              accessibilityRole="button"
            >
              <Text style={styles.kalenderToggleText}>
                {zeigeKalender ? '‹ Zurück zu Terminvorschlägen' : '📅  Alternativ: Kalender'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {zeigeKalender && (
            <Animated.View entering={FadeInDown.delay(60).springify()}>
              <GlassCard padding={16} radius={D.radius.md}>
                <MiniKalender onAuswahl={handleKalenderAuswahl} />
              </GlassCard>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {!zeigeKalender && (
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, !ausgewähltId && styles.buttonDisabled]}
              onPress={handleWeiter}
              disabled={!ausgewähltId}
              activeOpacity={0.85}
            >
              {ausgewähltId && (
                <LinearGradient
                  colors={[D.color.gradientTop, D.color.gradientBottom]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.buttonLabel, !ausgewähltId && styles.buttonLabelDisabled]}>Weiter</Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.color.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: D.color.glassBorder,
    gap: 12, backgroundColor: D.color.bgSoft,
  },
  zurückBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zurückIcon: { fontSize: 22, color: D.color.accent },
  headerTitel: { flex: 1, fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.ink, textAlign: 'center' },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 20 },
  hinweis: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19, paddingHorizontal: 4, marginBottom: 4 },
  cardAktiv: { borderWidth: 1.5, borderColor: D.color.accent } as object,
  terminRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  terminHinweis: { fontSize: 11, color: D.color.accent, fontWeight: D.font.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  terminTag: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.ink },
  terminZeit: { fontSize: D.font.sm, color: D.color.inkSecondary, marginTop: 2 },
  auswahlKreis: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(63,139,255,0.2)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  auswahlKreisAktiv: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  auswahlCheck: { color: '#fff', fontSize: 12, fontWeight: D.font.heavy },
  kalenderToggle: { alignItems: 'center', paddingVertical: 14, minHeight: 44, justifyContent: 'center' },
  kalenderToggleText: { fontSize: D.font.md, color: D.color.accent, fontWeight: D.font.semibold },
  footer: {
    backgroundColor: D.color.bgSoft, borderTopWidth: 0.5,
    borderTopColor: D.color.glassBorder, padding: 16,
  },
  button: {
    height: 56, borderRadius: D.radius.lg,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: 'rgba(63,139,255,0.1)',
  },
  buttonDisabled: { backgroundColor: 'rgba(0,0,0,0.04)' },
  buttonLabel: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.inkInverted },
  buttonLabelDisabled: { color: D.color.inkTertiary },
});
