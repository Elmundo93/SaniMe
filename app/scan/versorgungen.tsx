import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/GlassCard';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';
import type { Produkt } from '@sanime/domain';

interface ProduktKarteProps {
  produkt: Produkt;
  ausgewählt: boolean;
  onAuswählen: () => void;
  index: number;
}

function ProduktKarte({ produkt, ausgewählt, onAuswählen, index }: ProduktKarteProps) {
  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 80).springify().damping(18)}>
      <TouchableOpacity onPress={onAuswählen} activeOpacity={0.85}>
        <GlassCard
          padding={18}
          radius={D.radius.lg}
          style={ausgewählt ? styles.cardAusgewählt : undefined}
        >
          {ausgewählt && (
            <LinearGradient
              colors={['rgba(63,139,255,0.06)', 'rgba(63,139,255,0.02)']}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Header */}
          <View style={styles.produktHeader}>
            <View style={[styles.produktIcon, ausgewählt && styles.produktIconAktiv]}>
              <Feather name="activity" size={18} color={D.color.accent} />
            </View>
            <View style={styles.produktTitelBlock}>
              <Text style={styles.produktName}>{produkt.name}</Text>
              <Text style={styles.produktHersteller}>{produkt.hersteller}</Text>
            </View>
            <View style={[styles.auswahlKreis, ausgewählt && styles.auswahlKreisAktiv]}>
              {ausgewählt && <Feather name="check" size={12} color="#fff" />}
            </View>
          </View>

          {/* HiMi-Nummer */}
          <View style={styles.himiRow}>
            <Text style={styles.himiLabel}>HiMi-Nr.</Text>
            <Text style={styles.himiWert}>{produkt.hilfsmittelNr}</Text>
          </View>

          {/* Beschreibung */}
          <Text style={styles.beschreibung}>{produkt.beschreibung}</Text>

          {/* Merkmale */}
          <View style={styles.merkmale}>
            {produkt.merkmale.map((m) => (
              <View key={m} style={[styles.merkmalChip, ausgewählt && styles.merkmalChipAktiv]}>
                <Text style={[styles.merkmalText, ausgewählt && styles.merkmalTextAktiv]}>{m}</Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.produktFooter}>
            <View>
              <Text style={styles.eigenanteilLabel}>Gesetzlicher Eigenanteil</Text>
              <Text style={[styles.eigenanteilWert, ausgewählt && styles.eigenanteilWertAktiv]}>
                {produkt.eigenanteil === 0
                  ? 'Kein Eigenanteil'
                  : `${produkt.eigenanteil.toFixed(2).replace('.', ',')} €`}
              </Text>
            </View>
            <View style={styles.lieferzeitChip}>
              <Feather name="truck" size={12} color={D.color.inkSecondary} />
              <Text style={styles.lieferzeitText}>{produkt.lieferzeit}</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function VersorgungsauswahlScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('VERSORGUNGSAUSWAHL');
  const dispatch = useOnboardingStore((s) => s.dispatch);

  const [ausgewähltId, setAusgewähltId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!ready || !session) return <OnboardingLoadingView />;

  const produkte = session.verfügbareProdukte;
  const ocrResult = session.ocrResult;
  const ausgewählt = produkte.find((p) => p.id === ausgewähltId);

  const handleZurück = async () => {
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const handleVersorgungStarten = async () => {
    if (!ausgewählt) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const result = await dispatch({ type: 'SUPPLY_AUSGEWAEHLT', produkt: ausgewählt });
    setLoading(false);
    if (result.ok) {
      router.push(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
        {/* Header */}
        <ScreenHeader
          title="Versorgung wählen"
          onBack={handleZurück}
          right={
            <StepCounter
              aktuellerSchritt={STATUS_META.VERSORGUNGSAUSWAHL.schritt}
              gesamtSchritte={11}
              variant="light"
              label={`${STATUS_META.VERSORGUNGSAUSWAHL.schritt}/11`}
            />
          }
        />

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          {/* Diagnose-Banner */}
          <Animated.View entering={FadeInDown.delay(60).springify().damping(18)}>
            <View style={styles.diagnoseBanner}>
              <LinearGradient
                colors={['rgba(63,139,255,0.12)', 'rgba(63,139,255,0.05)']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.diagnoseLabel}>Erkannte Verordnung</Text>
              <Text style={styles.diagnoseWert}>{ocrResult?.hilfsmittel}</Text>
              {ocrResult?.hilfsmittelNr && (
                <Text style={styles.diagnoseNr}>HiMi-Gruppe {ocrResult.hilfsmittelNr}</Text>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).springify()}>
            <Text style={styles.produkteAnzahl}>
              {produkte.length} passende Versorgung{produkte.length !== 1 ? 'en' : ''} gefunden
            </Text>
          </Animated.View>

          {produkte.map((produkt, i) => (
            <ProduktKarte
              key={produkt.id}
              produkt={produkt}
              index={i}
              ausgewählt={produkt.id === ausgewähltId}
              onAuswählen={() => setAusgewähltId(produkt.id)}
            />
          ))}

          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <View style={styles.hinweisBox}>
              <Feather name="info" size={16} color={D.color.accent} style={styles.hinweisIcon} />
              <Text style={styles.hinweisText}>
                Alle Produkte sind durch Ihre Krankenkasse erstattungsfähig.
                Der Eigenanteil richtet sich nach dem gesetzlichen Festbetrag.
              </Text>
            </View>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollContainer>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          {ausgewählt && (
            <Text style={styles.footerInfo}>
              {ausgewählt.name} · {ausgewählt.lieferzeit}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.button, !ausgewählt && styles.buttonDisabled]}
            onPress={handleVersorgungStarten}
            disabled={!ausgewählt || loading}
            activeOpacity={0.85}
          >
            {ausgewählt && (
              <LinearGradient
                colors={[D.color.gradientTop, D.color.gradientBottom]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.buttonLabel, !ausgewählt && styles.buttonLabelDisabled]}>
                {ausgewählt ? 'Versorgung starten' : 'Bitte Versorgung wählen'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 12 },
  diagnoseBanner: {
    borderRadius: D.radius.md, padding: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(63,139,255,0.18)',
  },
  diagnoseLabel: { fontSize: 10, color: D.color.accent, fontWeight: D.font.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  diagnoseWert: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.ink },
  diagnoseNr: { fontSize: D.font.sm, color: D.color.accent, marginTop: 3, fontWeight: D.font.medium },
  produkteAnzahl: { fontSize: D.font.sm, color: D.color.inkSecondary, fontWeight: D.font.medium, paddingLeft: 4 },
  cardAusgewählt: {
    borderWidth: 1.5,
    borderColor: D.color.accent,
    overflow: 'hidden',
    ...D.shadow.card,
    shadowColor: D.color.accent,
    shadowOpacity: 0.18,
  } as object,
  produktHeader: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  produktIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: D.color.accentLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  produktIconAktiv: { backgroundColor: 'rgba(63,139,255,0.16)' },
  produktTitelBlock: { flex: 1 },
  produktName: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.ink, lineHeight: 20 },
  produktHersteller: { fontSize: D.font.sm, color: D.color.inkSecondary, marginTop: 2 },
  auswahlKreis: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(63,139,255,0.2)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  auswahlKreisAktiv: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  himiRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  himiLabel: { fontSize: 11, color: D.color.inkTertiary, fontWeight: D.font.semibold },
  himiWert: { fontSize: 11, color: D.color.inkSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  beschreibung: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19, marginBottom: 10 },
  merkmale: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  merkmalChip: {
    backgroundColor: D.color.bgSoft, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: D.color.glassBorder,
  },
  merkmalChipAktiv: { backgroundColor: D.color.accentLight, borderColor: 'rgba(63,139,255,0.25)' },
  merkmalText: { fontSize: 11, color: D.color.inkSecondary, fontWeight: D.font.medium },
  merkmalTextAktiv: { color: D.color.accent },
  produktFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderTopWidth: 0.5, borderTopColor: 'rgba(63,139,255,0.1)', paddingTop: 12,
  },
  eigenanteilLabel: { fontSize: 11, color: D.color.inkTertiary },
  eigenanteilWert: { fontSize: D.font.xl, fontWeight: D.font.heavy, color: D.color.ink },
  eigenanteilWertAktiv: { color: D.color.accent },
  lieferzeitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: D.color.bgSoft, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: D.color.glassBorder,
  },
  lieferzeitText: { fontSize: 11, color: D.color.inkSecondary, fontWeight: D.font.medium },
  hinweisBox: {
    flexDirection: 'row', gap: 10,
    backgroundColor: D.color.accentLight, borderRadius: D.radius.md,
    padding: 14, borderWidth: 1, borderColor: 'rgba(63,139,255,0.15)',
  },
  hinweisIcon: { marginTop: 2 },
  hinweisText: { flex: 1, fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19 },
  footer: {
    backgroundColor: D.color.bgSoft, borderTopWidth: 0.5,
    borderTopColor: D.color.glassBorder, padding: 16, gap: 8,
  },
  footerInfo: { fontSize: 11, color: D.color.inkSecondary, textAlign: 'center' },
  button: {
    height: 56, borderRadius: D.radius.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(63,139,255,0.1)',
  },
  buttonDisabled: { backgroundColor: 'rgba(0,0,0,0.04)' },
  buttonLabel: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.inkInverted },
  buttonLabelDisabled: { color: D.color.inkTertiary },
});
