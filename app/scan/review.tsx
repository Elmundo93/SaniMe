import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../components/ui/GlassCard';
import { DatenFeld, DatenFeldGruppenTitel } from '../../components/onboarding/DatenFeld';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { hatPflichtfelderRezept } from '../../store/onboardingMachine';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '../../constants/design';
import type { OcrResult } from '../../types';

export default function ReviewScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('REZEPT_PRUEFUNG', { requireOcrResult: true });
  const dispatch = useOnboardingStore((s) => s.dispatch);

  if (!ready || !session) return <OnboardingLoadingView />;

  const ocr = session.ocrResult!;
  const confidence = session.ocrConfidence;
  const vollständig = hatPflichtfelderRezept(session);

  const feldKorrigiert = (patch: Partial<OcrResult>) => {
    dispatch({ type: 'FELD_KORRIGIERT', patch });
  };

  const handleWeiter = async () => {
    const result = await dispatch({ type: 'WEITER' });
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
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleZurück} hitSlop={12} style={styles.zurückBtn} accessibilityLabel="Zurück">
            <Text style={styles.zurückIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitel}>Daten prüfen</Text>
          <StepCounter
            aktuellerSchritt={STATUS_META.REZEPT_PRUEFUNG.schritt}
            gesamtSchritte={11}
            variant="light"
            label={`${STATUS_META.REZEPT_PRUEFUNG.schritt}/11`}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Erfolgs-Banner */}
          <Animated.View entering={FadeInDown.delay(60).springify().damping(18)}>
            <View style={styles.successBanner}>
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>✓</Text>
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
          <Animated.View entering={FadeInDown.delay(130).springify().damping(18)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Patient" />
              <DatenFeld
                label="Name"
                wert={ocr.patient.name}
                confidence={confidence?.patient}
                onEdit={(w) => feldKorrigiert({ patient: { ...ocr.patient, name: w } })}
              />
              <DatenFeld
                label="Geburtsdatum"
                wert={ocr.patient.dateOfBirth}
                confidence={confidence?.patient}
                onEdit={(w) => feldKorrigiert({ patient: { ...ocr.patient, dateOfBirth: w } })}
              />
            </GlassCard>
          </Animated.View>

          {/* Arzt */}
          <Animated.View entering={FadeInDown.delay(190).springify().damping(18)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Verschreibender Arzt" />
              <DatenFeld
                label="Name"
                wert={ocr.arzt.name}
                confidence={confidence?.arzt}
                onEdit={(w) => feldKorrigiert({ arzt: { ...ocr.arzt, name: w } })}
              />
              {ocr.arzt.lanr && <DatenFeld label="LANR" wert={ocr.arzt.lanr} confidence="high" />}
            </GlassCard>
          </Animated.View>

          {/* Verordnung */}
          <Animated.View entering={FadeInDown.delay(250).springify().damping(18)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Verordnung" />
              <DatenFeld
                label="Diagnose"
                wert={ocr.diagnose}
                confidence={confidence?.diagnose}
                onEdit={(w) => feldKorrigiert({ diagnose: w })}
              />
              <DatenFeld
                label="Hilfsmittel"
                wert={ocr.hilfsmittel}
                confidence={confidence?.hilfsmittel}
                onEdit={(w) => feldKorrigiert({ hilfsmittel: w })}
              />
              {ocr.hilfsmittelNr && <DatenFeld label="Hilfsmittel-Nr." wert={ocr.hilfsmittelNr} confidence="high" />}
              <DatenFeld label="Ausstellungsdatum" wert={ocr.datum} confidence="high" />
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).springify()}>
            <TouchableOpacity onPress={handleNeuScannen} style={styles.neuScannenBtn} accessibilityRole="button">
              <Text style={styles.neuScannenText}>📷  Rezept erneut scannen</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky Footer */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
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
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: D.color.glassBorder,
    gap: 12,
    backgroundColor: D.color.bgSoft,
  },
  zurückBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zurückIcon: { fontSize: 22, color: D.color.accent },
  headerTitel: { flex: 1, fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.ink, textAlign: 'center' },
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
  successEmoji: { color: '#fff', fontSize: 16, fontWeight: D.font.heavy },
  successTitel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.success },
  successText: { fontSize: D.font.sm, color: D.color.inkSecondary, marginTop: 2 },
  legendeRow: { flexDirection: 'row', gap: 12, marginLeft: 'auto' },
  legendeItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendeDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendeText: { fontSize: 11, color: D.color.inkSecondary, fontWeight: D.font.medium },
  neuScannenBtn: { alignItems: 'center', paddingVertical: 14, minHeight: 44, justifyContent: 'center' },
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
