import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Checkbox } from '../../components/ui/Checkbox';
import { Section } from '../../components/ui/Section';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';

function SectionRow({ label, wert }: { label: string; wert: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowWert}>{wert}</Text>
    </View>
  );
}

export default function ZusammenfassungScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('ZUSAMMENFASSUNG', {
    requireOcrResult: true,
    requireSupply: true,
    requireAppointment: true,
  });
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const [bestätigt, setBestätigt] = useState(false);

  if (!ready || !session) return <OnboardingLoadingView />;

  const ocr = session.ocrResult!;
  const produkt = session.selectedSupply!;
  const termin = session.selectedAppointment!;
  const terminDatum = new Date(termin.beginn);
  const terminText = `${terminDatum.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}, ${terminDatum.getHours()}:00 Uhr`;
  const eigenanteilText = produkt.eigenanteil === 0 ? 'Kein Eigenanteil' : `${produkt.eigenanteil.toFixed(2).replace('.', ',')} €`;

  const handleZurück = async () => {
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const handleWeiter = async () => {
    if (!bestätigt) return;
    const result = await dispatch({ type: 'AUFTRAG_BESTAETIGT' });
    if (result.ok) {
      router.push(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
        <ScreenHeader
          title="Zusammenfassung"
          onBack={handleZurück}
          right={
            <StepCounter
              aktuellerSchritt={STATUS_META.ZUSAMMENFASSUNG.schritt}
              gesamtSchritte={11}
              variant="light"
              label={`${STATUS_META.ZUSAMMENFASSUNG.schritt}/11`}
            />
          }
        />

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.delay(60).springify().damping(18)}>
            <Section titel="Person & Krankenkasse" aktionLabel="Bearbeiten" onAktion={() => router.push('/scan/datenpruefung' as any)} padding={16}>
              <SectionRow label="Name" wert={ocr.patient.name} />
              <SectionRow label="Krankenkasse" wert={ocr.krankenkasse.name} />
              <SectionRow label="Versichertennummer" wert={ocr.krankenkasse.versichertenNr} />
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).springify().damping(18)}>
            <Section titel="Rezept" aktionLabel="Bearbeiten" onAktion={() => router.push('/scan/datenpruefung' as any)} padding={16}>
              <SectionRow label="Diagnose" wert={ocr.diagnose} />
              <SectionRow label="Hilfsmittel" wert={ocr.hilfsmittel} />
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).springify().damping(18)}>
            <Section titel="Versorgung" aktionLabel="Bearbeiten" onAktion={() => router.push('/scan/versorgungen' as any)} padding={16}>
              <SectionRow label="Produkt" wert={produkt.name} />
              <SectionRow label="Hersteller" wert={produkt.hersteller} />
              <SectionRow label="Lieferzeit" wert={produkt.lieferzeit} />
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).springify().damping(18)}>
            <Section titel="Termin" aktionLabel="Bearbeiten" onAktion={() => router.push('/scan/termin' as any)} padding={16}>
              <SectionRow label="Wann" wert={terminText} />
              <SectionRow label="Wo" wert={termin.ort} />
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify().damping(18)}>
            <View style={styles.zuzahlungBox}>
              <Text style={styles.zuzahlungLabel}>Eigenleistung / Zuzahlung</Text>
              <Text style={styles.zuzahlungWert}>{eigenanteilText}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).springify().damping(18)} style={styles.confirmBox}>
            <Checkbox
              checked={bestätigt}
              onToggle={setBestätigt}
              label="Ich bestätige die verbindliche Beauftragung."
            />
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollContainer>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !bestätigt && styles.buttonDisabled]}
            onPress={handleWeiter}
            disabled={!bestätigt}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Weiter zum Checkout"
            accessibilityState={{ disabled: !bestätigt }}
          >
            {bestätigt && (
              <LinearGradient
                colors={[D.color.gradientTop, D.color.gradientBottom]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[styles.buttonLabel, !bestätigt && styles.buttonLabelDisabled]}>Weiter zum Checkout</Text>
          </TouchableOpacity>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 12, paddingBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel: { fontSize: D.font.sm, color: D.color.inkSecondary, flexShrink: 0 },
  rowWert: { fontSize: D.font.sm, color: D.color.ink, fontWeight: D.font.medium, flex: 1, textAlign: 'right' },
  zuzahlungBox: {
    backgroundColor: D.color.accentLight, borderRadius: D.radius.md,
    padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(63,139,255,0.15)',
  },
  zuzahlungLabel: { fontSize: D.font.sm, color: D.color.inkSecondary, fontWeight: D.font.medium },
  zuzahlungWert: { fontSize: D.font.xl, fontWeight: D.font.heavy, color: D.color.accent },
  confirmBox: {
    backgroundColor: D.color.bgSoft, borderRadius: D.radius.md, padding: 16,
    borderWidth: 1, borderColor: D.color.glassBorder,
  },
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
