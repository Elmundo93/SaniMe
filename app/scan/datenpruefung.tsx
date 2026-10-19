import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { einblenden } from '../../lib/einblenden';
import { LinearGradient } from 'expo-linear-gradient';
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
import { findePosition, hatPflichtfelderKomplett } from '@sanime/domain';

export default function DatenpruefungScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('DATENPRUEFUNG', { requireOcrResult: true });
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const { feldKorrigiert, abwarten: korrekturenAbwarten } = useFeldKorrektur();

  if (!ready || !session) return <OnboardingLoadingView />;

  const ocr = session.ocrResult!;
  const vollständig = hatPflichtfelderKomplett(session);
  // Rezept für eine Position der Bestellung (statt Rezept zuerst): Weiter
  // ordnet es zu und führt zurück an die Kasse. Beim Bearbeiten eines schon
  // zugeordneten Rezepts führt auch Zurück direkt dorthin.
  const position = findePosition(session, session.aktivePositionId);
  const bearbeitet = !!position?.rezept;

  const handleZurück = async () => {
    await korrekturenAbwarten();
    const result = await dispatch(bearbeitet ? { type: 'ZURUECK_CHECKOUT' } : { type: 'ZURUECK' });
    if (result.ok) {
      if (bearbeitet) router.dismissTo(STATUS_META[result.session.status].route as any);
      else router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const handleWeiter = async () => {
    await korrekturenAbwarten();
    const result = await dispatch(position ? { type: 'REZEPT_ZUGEORDNET' } : { type: 'WEITER' });
    if (result.ok) {
      // Zurück an der Kasse ersetzt die Scan-Screens, statt sie zu stapeln.
      if (position) router.dismissTo(STATUS_META[result.session.status].route as any);
      else router.push(STATUS_META[result.session.status].route as any);
    } else {
      Alert.alert(
        'Bitte vervollständigen',
        'Name, Krankenkasse, Versichertennummer und Hilfsmittel müssen ausgefüllt sein.',
      );
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
        <ScreenHeader
          title="Daten prüfen"
          onBack={handleZurück}
          right={<ScanSchrittZaehler session={session} />}
        />

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={einblenden(40)}>
            <Text style={styles.hinweis}>
              Hier siehst du alle erkannten Daten auf einen Blick. Du kannst jedes Feld antippen und korrigieren.
            </Text>
          </Animated.View>

          <Animated.View entering={einblenden(100)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Person" />
              <DatenFeld
                label="Name"
                wert={ocr.patient.name}
                onEdit={(w) => feldKorrigiert((o) => ({ patient: { ...o.patient, name: w } }))}
              />
              <DatenFeld
                label="Geburtsdatum"
                wert={ocr.patient.dateOfBirth}
                onEdit={(w) => feldKorrigiert((o) => ({ patient: { ...o.patient, dateOfBirth: w } }))}
              />
            </GlassCard>
          </Animated.View>

          <Animated.View entering={einblenden(160)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Krankenkasse" />
              <DatenFeld
                label="Kasse"
                wert={ocr.krankenkasse.name}
                onEdit={(w) => feldKorrigiert((o) => ({ krankenkasse: { ...o.krankenkasse, name: w } }))}
              />
              <DatenFeld
                label="Versichertennummer"
                wert={ocr.krankenkasse.versichertenNr}
                onEdit={(w) => feldKorrigiert((o) => ({ krankenkasse: { ...o.krankenkasse, versichertenNr: w } }))}
              />
              {ocr.krankenkasse.ik && <DatenFeld label="IK-Nummer" wert={ocr.krankenkasse.ik} confidence="high" />}
            </GlassCard>
          </Animated.View>

          <Animated.View entering={einblenden(220)}>
            <GlassCard padding={0} radius={D.radius.md}>
              <DatenFeldGruppenTitel title="Rezept" />
              <DatenFeld
                label="Arzt"
                wert={ocr.arzt.name}
                onEdit={(w) => feldKorrigiert((o) => ({ arzt: { ...o.arzt, name: w } }))}
              />
              <DatenFeld
                label="Diagnose"
                wert={ocr.diagnose}
                onEdit={(w) => feldKorrigiert(() => ({ diagnose: w }))}
              />
              <DatenFeld
                label="Hilfsmittel"
                wert={ocr.hilfsmittel}
                onEdit={(w) => feldKorrigiert(() => ({ hilfsmittel: w }))}
              />
            </GlassCard>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollContainer>

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
              {!vollständig
                ? 'Bitte alle Pflichtfelder ausfüllen'
                : position
                  ? `Rezept für ${position.produkt.name} übernehmen`
                  : 'Weiter zur Versorgungsauswahl'}
            </Text>
          </TouchableOpacity>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 12, paddingBottom: 20 },
  hinweis: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19, paddingHorizontal: 4 },
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
