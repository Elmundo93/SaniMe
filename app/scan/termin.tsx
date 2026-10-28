import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { einblenden } from '../../lib/einblenden';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/GlassCard';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { MiniKalender } from '../../components/onboarding/MiniKalender';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { lieferort, terminAusKalenderdatum, terminAusVorschlag } from '../../lib/terminplanung';
import { selectProfil, useAuthStore } from '../../store/authStore';
import { getAppointmentSlots } from '../../lib/api/onboarding';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';
import type { TerminSlot } from '@sanime/domain';

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
  const profilAdresse = useAuthStore((s) => selectProfil(s)?.lieferadresse ?? null);
  const [ausgewähltId, setAusgewähltId] = useState<string | null>(null);
  const [zeigeKalender, setZeigeKalender] = useState(false);

  useEffect(() => {
    if (!session || session.terminVorschläge.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const slots = await getAppointmentSlots(session.id);
        if (cancelled) return;
        const ort = lieferort(session, profilAdresse);
        const vorschläge = slots.map((slot, i) => terminAusVorschlag(slot, i, ort));
        const result = await dispatch({ type: 'TERMIN_VORSCHLAEGE_BERECHNET', vorschläge });
        if (!cancelled && !result.ok) zeigeDispatchFehler();
      } catch {
        if (!cancelled) zeigeDispatchFehler();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.terminVorschläge.length]);

  if (!ready || !session) return <OnboardingLoadingView />;

  // Die Terminwahl ist eine Speiche des Checkouts: Zurück wie Bestätigen
  // führen zur vorhandenen Kasse im Stack zurück.
  const handleZurück = async () => {
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.dismissTo(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const bestätigen = async (termin: TerminSlot) => {
    const result = await dispatch({ type: 'TERMIN_AUSGEWAEHLT', termin });
    if (result.ok) {
      router.dismissTo(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const handleWeiter = async () => {
    const termin = session.terminVorschläge.find((t) => t.id === ausgewähltId);
    if (!termin) return;
    await bestätigen(termin);
  };

  const handleKalenderAuswahl = async (datum: Date) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await bestätigen(terminAusKalenderdatum(session, datum, lieferort(session, profilAdresse)));
  };

  return (
    <Screen edges={['top', 'bottom']}>
        <ScreenHeader
          title="Termin wählen"
          onBack={handleZurück}
        />

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={einblenden(40)}>
            <Text style={styles.hinweis}>
              Wir haben passende Termine für deine Lieferung berechnet — basierend auf Bearbeitungsdauer, Lieferzeit und Verfügbarkeit.
            </Text>
          </Animated.View>

          {!zeigeKalender && session.terminVorschläge.map((termin, i) => {
            const { tag, zeit } = formatTermin(termin);
            const ausgewählt = termin.id === ausgewähltId;
            return (
              <Animated.View key={termin.id} entering={einblenden(100 + i * 80)}>
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
                        {ausgewählt && <Feather name="check" size={12} color="#fff" />}
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          <Animated.View entering={einblenden(420)}>
            <TouchableOpacity
              onPress={() => setZeigeKalender((v) => !v)}
              style={styles.kalenderToggle}
              accessibilityRole="button"
            >
              <Feather name={zeigeKalender ? 'chevron-left' : 'calendar'} size={16} color={D.color.accent} />
              <Text style={styles.kalenderToggleText}>
                {zeigeKalender ? 'Zurück zu Terminvorschlägen' : 'Alternativ: Kalender'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {zeigeKalender && (
            <Animated.View entering={einblenden(60)}>
              <GlassCard padding={16} radius={D.radius.md}>
                <MiniKalender onAuswahl={handleKalenderAuswahl} />
              </GlassCard>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollContainer>

        {!zeigeKalender && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, !ausgewähltId && styles.buttonDisabled]}
              onPress={handleWeiter}
              disabled={!ausgewähltId}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Weiter"
              accessibilityState={{ disabled: !ausgewähltId }}
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
          </View>
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  kalenderToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, minHeight: 44 },
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
