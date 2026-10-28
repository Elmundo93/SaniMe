import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { einblenden } from '../../../lib/einblenden';
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
import { Button } from '../../../components/ui/Button';
import { naechsterSchritt, notfallMoeglich, notfallText, terminText } from '../../../lib/versorgungsprozess';
import { Feather } from '@expo/vector-icons';
import { D, durations } from '@sanime/design-system';

const STEPS: { label: string; key: string }[] = [
  { label: 'Bestellung eingegangen',     key: 'PENDING_REVIEW' },
  { label: 'Antrag bei der Krankenkasse', key: 'PENDING_INSURANCE' },
  { label: 'Genehmigt',                  key: 'APPROVED' },
  { label: 'Wird vorbereitet',           key: 'PROCESSING' },
  { label: 'Lieferung',                  key: 'SHIPPED' },
];

// Selbst bezahlt: es gibt keinen Antrag und keine Genehmigung.
const STEPS_SELBSTZAHLER = STEPS.filter((s) => s.key !== 'PENDING_INSURANCE').map((s) =>
  s.key === 'APPROVED' ? { ...s, label: 'Freigegeben' } : s,
);

function getStepStatus(currentStatus: string, stepKey: string): StepStatus {
  const order = ['PENDING_REVIEW', 'PENDING_INSURANCE', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const cur = order.indexOf(currentStatus);
  const step = order.indexOf(stepKey);
  if (step < cur) return 'done';
  if (step === cur) return 'active';
  return 'pending';
}

function InfoZeile({ label, wert }: { label: string; wert: string }) {
  // Bei großer Schrift untereinander statt nebeneinander — sonst bleibt je
  // Spalte nur ein Wort pro Zeile.
  const gross = useWindowDimensions().fontScale >= 1.35;
  return (
    <View style={[styles.infoZeile, gross && styles.infoZeileGross]} accessible accessibilityLabel={`${label}: ${wert}`}>
      <Text style={[styles.infoLabel, gross && { flex: 0 }]}>{label}</Text>
      <Text style={[styles.infoWert, gross && styles.infoWertGross]}>{wert}</Text>
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
  const schritte = versorgung.selbstzahler ? STEPS_SELBSTZAHLER : STEPS;
  const weiter = naechsterSchritt(versorgung);
  const notfall = notfallText(versorgung);

  return (
    <Screen background={<HeroGlow />}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(durations.slow)}>
          <ScreenHeader title={versorgung.produkt} onBack={() => router.back()} backSize={40} />
        </Animated.View>

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          {/* Status Hero */}
          <Animated.View entering={einblenden(80)}>
            <GlassCard padding={22} radius={D.radius.xl}>
              <Text style={styles.statusChipLabel} maxFontSizeMultiplier={1.8}>AKTUELLER STATUS</Text>
              <View style={styles.statusRow}>
                <StatusBadge status={versorgung.status} />
              </View>
              {/* Schon groß gesetzt — begrenzt mitwachsen, damit „Wie geht es
                  weiter?“ bei größter Schrift nicht aus dem Blick rutscht. */}
              <Text style={styles.produktTitel} maxFontSizeMultiplier={1.5}>{versorgung.produkt}</Text>
              {!!versorgung.hilfsmittelNr && (
                <Text style={styles.himiNr} maxFontSizeMultiplier={1.5} accessibilityLabel={`Hilfsmittelnummer ${versorgung.hilfsmittelNr}`}>
                  HiMi-Nr. {versorgung.hilfsmittelNr}
                </Text>
              )}
            </GlassCard>
          </Animated.View>

          {/* Wie geht es weiter? — Stand, nächster Schritt, ggf. die eine Aktion des Kunden */}
          {weiter && (
            <Animated.View entering={einblenden(120)}>
              <GlassCard padding={20} radius={D.radius.lg} style={weiter.aktion ? styles.aktionCard : undefined}>
                <Text style={styles.sectionTitel} accessibilityRole="header">Wie geht es weiter?</Text>
                <Text style={styles.weiterTitel} maxFontSizeMultiplier={1.6}>{weiter.titel}</Text>
                <Text style={styles.weiterText}>{weiter.text}</Text>
                {weiter.aktion === 'termin' && (
                  <Button
                    label="Liefertermin wählen"
                    größe="lg"
                    style={{ marginTop: 16 }}
                    onPress={() => router.push(`/versorgung/termin/${versorgung.id}`)}
                  />
                )}
                {notfall && (
                  <View style={styles.notfallBox} accessible accessibilityLabel={notfall}>
                    <Feather name="phone-call" size={16} color={D.color.accent} />
                    <Text style={styles.notfallText}>{notfall}</Text>
                  </View>
                )}
              </GlassCard>
            </Animated.View>
          )}

          {notfallMoeglich(versorgung) && (
            <TouchableOpacity
              style={styles.notfallLink}
              onPress={() => router.push(`/versorgung/notfall/${versorgung.id}`)}
              accessibilityRole="button"
              accessibilityLabel="Früher benötigt? Notfalllieferung anfragen"
            >
              <Feather name="alert-circle" size={16} color={D.color.accent} />
              <Text style={styles.notfallLinkText}>Früher benötigt? Notfalllieferung anfragen</Text>
            </TouchableOpacity>
          )}

          {/* Prozessschritte */}
          {!isAbgeschlossen && (
            <Animated.View entering={einblenden(160)}>
              <GlassCard padding={22} radius={D.radius.lg}>
                <Text style={styles.sectionTitel} accessibilityRole="header">Fortschritt</Text>
                <View style={styles.steps}>
                  {schritte.map((step, i) => (
                    <ProcessStep
                      key={step.key}
                      label={step.label}
                      status={getStepStatus(versorgung.status, step.key)}
                      isLast={i === schritte.length - 1}
                      index={i}
                    />
                  ))}
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Details */}
          <Animated.View entering={einblenden(260)}>
            <GlassCard padding={20} radius={D.radius.lg}>
              <Text style={styles.sectionTitel} accessibilityRole="header">Details</Text>
              {!!versorgung.arzt && <InfoZeile label="Arzt" wert={versorgung.arzt} />}
              {!versorgung.selbstzahler && <InfoZeile label="Krankenkasse" wert={versorgung.krankenkasse} />}
              {versorgung.termin && <InfoZeile label="Liefertermin" wert={terminText(versorgung.termin)} />}
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
          <Animated.View entering={einblenden(320)}>
            <GlassCard padding={20} radius={D.radius.lg}>
              <Text style={styles.sectionTitel} accessibilityRole="header">Verlauf</Text>
              <StatusTimeline events={versorgung.timeline} />
            </GlassCard>
          </Animated.View>

          {/* Support */}
          <Animated.View entering={einblenden(380)}>
            <View style={styles.hilfeSection}>
              <Text style={styles.hilfeText}>Fragen zu deiner Versorgung?</Text>
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
  weiterTitel: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.ink, marginBottom: 6 },
  weiterText: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 22 },
  notfallBox: { flexDirection: 'row', gap: 10, marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: 'rgba(63,139,255,0.08)' },
  notfallText: { flex: 1, fontSize: D.font.sm, color: D.color.ink, lineHeight: 20 },
  notfallLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 4 },
  notfallLinkText: { fontSize: D.font.md, fontWeight: D.font.semibold, color: D.color.accent },
  infoZeile: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(63,139,255,0.08)', gap: 12,
  },
  infoZeileGross: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  infoWertGross: { textAlign: 'left', flex: 0 },
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
