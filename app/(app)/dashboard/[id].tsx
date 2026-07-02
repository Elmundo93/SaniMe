import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { BackLink } from '../../../components/ui/BackLink';
import { HeroGlow } from '../../../components/ui/HeroGlow';
import { Screen } from '../../../components/ui/Screen';
import { ScrollContainer } from '../../../components/ui/ScrollContainer';
import { ProcessStep, type StepStatus } from '../../../components/ui/ProcessStep';
import { StatusTimeline } from '../../../components/dashboard/StatusTimeline';
import { useVersorgungStore } from '../../../store/versorgungStore';
import { D, durations } from '@sanime/design-system';

const STEPS: { label: string; key: string }[] = [
  { label: 'Rezept geprüft',             key: 'PENDING_REVIEW' },
  { label: 'Krankenkasse kontaktiert',   key: 'PENDING_INSURANCE' },
  { label: 'Genehmigung erhalten',       key: 'APPROVED' },
  { label: 'Bestellung aufgegeben',      key: 'PROCESSING' },
  { label: 'Versand & Lieferung',        key: 'SHIPPED' },
];

function getStepStatus(currentStatus: string, stepKey: string): StepStatus {
  const order = ['PENDING_REVIEW', 'PENDING_INSURANCE', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const cur = order.indexOf(currentStatus);
  const step = order.indexOf(stepKey);
  if (step < cur) return 'done';
  if (step === cur) return 'active';
  return 'pending';
}

function InfoZeile({ label, wert }: { label: string; wert: string }) {
  return (
    <View style={styles.infoZeile}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoWert} numberOfLines={2}>{wert}</Text>
    </View>
  );
}

export default function VersorgungsdetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const versorgungen = useVersorgungStore((s) => s.versorgungen);
  const versorgung = versorgungen.find((v) => v.id === id);

  if (!versorgung) {
    return (
      <Screen>
        <View style={styles.notFoundArea}>
          <Text style={styles.notFoundText}>Versorgung nicht gefunden.</Text>
          <BackLink onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const isAbgeschlossen = ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(versorgung.status);

  return (
    <Screen background={<HeroGlow />}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(durations.slow)}>
          <ScreenHeader title={versorgung.produkt} onBack={() => router.back()} backSize={40} />
        </Animated.View>

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          {/* Status Hero */}
          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
            <GlassCard padding={22} radius={D.radius.xl}>
              <Text style={styles.statusChipLabel}>AKTUELLER STATUS</Text>
              <View style={styles.statusRow}>
                <StatusBadge status={versorgung.status} />
              </View>
              <Text style={styles.produktTitel} numberOfLines={2}>{versorgung.produkt}</Text>
              <Text style={styles.himiNr}>
                HiMi-Nr. {versorgung.hilfsmittelNr}
              </Text>
            </GlassCard>
          </Animated.View>

          {/* Prozessschritte */}
          {!isAbgeschlossen && (
            <Animated.View entering={FadeInDown.delay(160).springify().damping(18)}>
              <GlassCard padding={22} radius={D.radius.lg}>
                <Text style={styles.sectionTitel}>Fortschritt</Text>
                <View style={styles.steps}>
                  {STEPS.map((step, i) => (
                    <ProcessStep
                      key={step.key}
                      label={step.label}
                      status={getStepStatus(versorgung.status, step.key)}
                      isLast={i === STEPS.length - 1}
                      index={i}
                    />
                  ))}
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Offene Aktionen */}
          {versorgung.offeneAktionen.length > 0 && (
            <Animated.View entering={FadeInDown.delay(220).springify().damping(18)}>
              <GlassCard padding={20} radius={D.radius.lg} style={styles.aktionCard}>
                <Text style={styles.sectionTitel}>Ihre Aktion erforderlich</Text>
                {versorgung.offeneAktionen.map((a) => (
                  <View key={a.id} style={styles.aktionBox}>
                    <Text style={styles.aktionTitel}>{a.titel}</Text>
                    <Text style={styles.aktionBeschreibung}>{a.beschreibung}</Text>
                  </View>
                ))}
              </GlassCard>
            </Animated.View>
          )}

          {/* Details */}
          <Animated.View entering={FadeInDown.delay(260).springify().damping(18)}>
            <GlassCard padding={20} radius={D.radius.lg}>
              <Text style={styles.sectionTitel}>Details</Text>
              <InfoZeile label="Arzt" wert={versorgung.arzt} />
              <InfoZeile label="Krankenkasse" wert={versorgung.krankenkasse} />
              {versorgung.hersteller && (
                <InfoZeile label="Hersteller" wert={versorgung.hersteller} />
              )}
              {versorgung.lieferzeit && (
                <InfoZeile label="Lieferzeit" wert={versorgung.lieferzeit} />
              )}
              {versorgung.ansprechpartner && (
                <InfoZeile label="Ansprechpartner" wert={versorgung.ansprechpartner} />
              )}
              {versorgung.lieferadresse && (
                <InfoZeile label="Lieferadresse" wert={versorgung.lieferadresse} />
              )}
              <InfoZeile
                label="Erstellt"
                wert={new Date(versorgung.erstellt).toLocaleDateString('de-DE', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              />
            </GlassCard>
          </Animated.View>

          {/* Verlauf */}
          <Animated.View entering={FadeInDown.delay(320).springify().damping(18)}>
            <GlassCard padding={20} radius={D.radius.lg}>
              <Text style={styles.sectionTitel}>Verlauf</Text>
              <StatusTimeline events={versorgung.timeline} />
            </GlassCard>
          </Animated.View>

          {/* Support */}
          <Animated.View entering={FadeInDown.delay(380).springify()}>
            <View style={styles.hilfeSection}>
              <Text style={styles.hilfeText}>Fragen zu Ihrer Versorgung?</Text>
              <TouchableOpacity style={styles.supportBtn} activeOpacity={0.75}>
                <Text style={styles.supportBtnText}>Support kontaktieren</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={{ height: 60 }} />
        </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notFoundArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontSize: D.font.lg, color: D.color.inkSecondary },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },
  statusChipLabel: {
    fontSize: 10, fontWeight: D.font.bold, color: D.color.accent,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },
  statusRow: { marginBottom: 14 },
  produktTitel: {
    fontSize: D.font.xl, fontWeight: D.font.heavy,
    color: D.color.ink, letterSpacing: -0.4, marginBottom: 6,
  },
  himiNr: {
    fontSize: D.font.sm, color: D.color.inkTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sectionTitel: {
    fontSize: 11, fontWeight: D.font.bold, color: D.color.inkTertiary,
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 16,
  },
  steps: { gap: 0 },
  aktionCard: {
    backgroundColor: 'rgba(255,159,10,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,159,10,0.2)',
  },
  aktionBox: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: 14,
  },
  aktionTitel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.ink, marginBottom: 4 },
  aktionBeschreibung: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 20 },
  infoZeile: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(63,139,255,0.08)', gap: 12,
  },
  infoLabel: { fontSize: D.font.sm, color: D.color.inkSecondary, flex: 1 },
  infoWert: { fontSize: D.font.sm, fontWeight: D.font.semibold, color: D.color.ink, flex: 1.5, textAlign: 'right' },
  hilfeSection: { alignItems: 'center', paddingVertical: 8, gap: 12 },
  hilfeText: { fontSize: D.font.sm, color: D.color.inkSecondary },
  supportBtn: {
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: D.radius.md, borderWidth: 1.5, borderColor: 'rgba(63,139,255,0.2)',
  },
  supportBtnText: { fontSize: D.font.md, fontWeight: D.font.semibold, color: D.color.accent },
});
