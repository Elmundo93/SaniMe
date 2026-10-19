import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { einblenden } from '../../lib/einblenden';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/GlassCard';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { DatenFeld, DatenFeldGruppenTitel } from '../../components/onboarding/DatenFeld';
import { ScanSchrittZaehler } from '../../components/onboarding/ScanSchrittZaehler';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { useFeldKorrektur } from '../../hooks/useFeldKorrektur';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';
import { hatPflichtfelderRezept } from '@sanime/domain';

export default function ReviewScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('REZEPT_PRUEFUNG', { requireOcrResult: true });
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const { feldKorrigiert, abwarten: korrekturenAbwarten } = useFeldKorrektur();

  if (!ready || !session) return <OnboardingLoadingView />;

  const ocr = session.ocrResult!;
  const confidence = session.ocrConfidence;
  const vollständig = hatPflichtfelderRezept(session);

  const handleWeiter = async () => {
    await korrekturenAbwarten();
    // Ist die Krankenkasse aus einem früheren Rezept dieser Bestellung schon
    // bekannt, muss die Karte nicht noch einmal fotografiert werden.
    const result = await dispatch(session.krankenkasse ? { type: 'WEITER_KRANKENKASSE_BEKANNT' } : { type: 'WEITER' });
    if (result.ok) {
      router.push(STATUS_META[result.session.status].route as any);
    } else {
      Alert.alert('Bitte vervollständigen', 'Name, Arzt, Diagnose und Hilfsmittel müssen ausgefüllt sein.');
    }
  };

  const handleNeuScannen = () => {
    Alert.alert('Neu scannen', 'Rezept erneut scannen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Neu scannen',
        onPress: async () => {
          await korrekturenAbwarten();
          const result = await dispatch({ type: 'ZURUECK' });
          if (result.ok) {
            router.replace(STATUS_META[result.session.status].route as any);
          } else {
            zeigeDispatchFehler();
          }
        },
      },
    ]);
  };

  const handleZurück = async () => {
    await korrekturenAbwarten();
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
        {/* Header */}
        <ScreenHeader
          title="Daten prüfen"
          onBack={handleZurück}
          right={<ScanSchrittZaehler session={session} />}
        />

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          {/* Erfolgs-Banner */}
          <Animated.View entering={einblenden(60)}>
            <View style={styles.successBanner}>
              <View style={styles.successIcon}>
                <Feather name="check" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitel}>Rezept erkannt</Text>
                <Text style={styles.successText}>Bitte prüfen Sie die extrahierten Daten.</Text>
              </View>
              <View style={styles.legendeRow}>
                <View style={styles.legendeItem}>
                  <View style={[styles.legendeDot, { backgroundColor: D.color.success }]} />
                  <Text style={styles.legendeText}>Sicher</Text>
                </View>
                <View style={styles.legendeItem}>
                  <View style={[styles.legendeDot, { backgroundColor: D.color.warning }]} />
                  <Text style={styles.legendeText}>Prüfen</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Patient */}
          <Animated.View entering={einblenden(130)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Patient" />
              <DatenFeld
                label="Name"
                wert={ocr.patient.name}
                confidence={confidence?.patient}
                onEdit={(w) => feldKorrigiert((o) => ({ patient: { ...o.patient, name: w } }))}
              />
              <DatenFeld
                label="Geburtsdatum"
                wert={ocr.patient.dateOfBirth}
                confidence={confidence?.patient}
                onEdit={(w) => feldKorrigiert((o) => ({ patient: { ...o.patient, dateOfBirth: w } }))}
              />
            </GlassCard>
          </Animated.View>

          {/* Arzt */}
          <Animated.View entering={einblenden(190)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Verschreibender Arzt" />
              <DatenFeld
                label="Name"
                wert={ocr.arzt.name}
                confidence={confidence?.arzt}
                onEdit={(w) => feldKorrigiert((o) => ({ arzt: { ...o.arzt, name: w } }))}
              />
              {ocr.arzt.lanr && <DatenFeld label="LANR" wert={ocr.arzt.lanr} confidence="high" />}
            </GlassCard>
          </Animated.View>

          {/* Verordnung */}
          <Animated.View entering={einblenden(250)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Verordnung" />
              <DatenFeld
                label="Diagnose"
                wert={ocr.diagnose}
                confidence={confidence?.diagnose}
                onEdit={(w) => feldKorrigiert(() => ({ diagnose: w }))}
              />
              <DatenFeld
                label="Hilfsmittel"
                wert={ocr.hilfsmittel}
                confidence={confidence?.hilfsmittel}
                onEdit={(w) => feldKorrigiert(() => ({ hilfsmittel: w }))}
              />
              {ocr.hilfsmittelNr && <DatenFeld label="Hilfsmittel-Nr." wert={ocr.hilfsmittelNr} confidence="high" />}
              <DatenFeld label="Ausstellungsdatum" wert={ocr.datum} confidence="high" />
            </GlassCard>
          </Animated.View>

          <Animated.View entering={einblenden(320)}>
            <TouchableOpacity onPress={handleNeuScannen} style={styles.neuScannenBtn} accessibilityRole="button">
              <Feather name="camera" size={16} color={D.color.accent} />
              <Text style={styles.neuScannenText}>Rezept erneut scannen</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollContainer>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !vollständig && styles.buttonDisabled]}
            onPress={handleWeiter}
            disabled={!vollständig}
            activeOpacity={0.85}
          >
            {vollständig && (
              <LinearGradient
                colors={[D.color.gradientTop, D.color.gradientBottom]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[styles.buttonLabel, !vollständig && styles.buttonLabelDisabled]}>
              {vollständig ? 'Weiter' : 'Bitte alle Pflichtfelder ausfüllen'}
            </Text>
          </TouchableOpacity>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 12, paddingBottom: 20 },
  successBanner: {
    flexDirection: 'row',
    backgroundColor: D.color.successLight,
    borderRadius: D.radius.md,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.2)',
    flexWrap: 'wrap',
  },
  successIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: D.color.success,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  successTitel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.success },
  successText: { fontSize: D.font.sm, color: D.color.inkSecondary, marginTop: 2 },
  legendeRow: { flexDirection: 'row', gap: 12, marginLeft: 'auto' },
  legendeItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendeDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendeText: { fontSize: 11, color: D.color.inkSecondary, fontWeight: D.font.medium },
  neuScannenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, minHeight: 44 },
  neuScannenText: { fontSize: D.font.md, color: D.color.accent, fontWeight: D.font.semibold },
  footer: {
    backgroundColor: D.color.bgSoft,
    borderTopWidth: 0.5,
    borderTopColor: D.color.glassBorder,
    padding: 16,
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
