import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../../components/ui/GlassCard';
import { ProcessStep, type StepStatus } from '../../../components/ui/ProcessStep';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { CircularProgress } from '../../../components/ui/CircularProgress';
import type { TimelineEvent } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { useVersorgungStore } from '../../../store/versorgungStore';
import { D } from '../../../constants/design';

// Datum für Prozessschritt aus Timeline-Events extrahieren
function getDatumForStep(timeline: TimelineEvent[], stepKey: string): string | undefined {
  const event = timeline.find(
    (t) => t.status === stepKey && t.abgeschlossen && t.zeitpunkt,
  );
  if (!event) return undefined;
  return new Date(event.zeitpunkt).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Mapping auf Prozess-Schritte
function getStepStatus(currentStatus: string, stepStatus: string): StepStatus {
  const order = ['PENDING_REVIEW', 'PENDING_INSURANCE', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const cur = order.indexOf(currentStatus);
  const step = order.indexOf(stepStatus);
  if (step < cur) return 'done';
  if (step === cur) return 'active';
  return 'pending';
}

const STEPS: { label: string; key: string }[] = [
  { label: 'Rezept eingegangen',       key: 'PENDING_REVIEW' },
  { label: 'Krankenkasse prüft',       key: 'PENDING_INSURANCE' },
  { label: 'Lieferung vorbereitet',    key: 'APPROVED' },
  { label: 'Versand',                  key: 'PROCESSING' },
  { label: 'Versorgung abgeschlossen', key: 'SHIPPED' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const benutzer = useAuthStore((s) => s.benutzer);
  const { versorgungen, laden } = useVersorgungStore();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    laden().finally(() => setIsLoading(false));
  }, [laden]);

  const aktive = versorgungen.filter(
    (v) => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(v.status),
  );
  const abgeschlossen = versorgungen.filter((v) =>
    ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(v.status),
  );
  const featured = aktive[0];

  const progressValue =
    featured?.status === 'PENDING_REVIEW'    ? 0.18 :
    featured?.status === 'PENDING_INSURANCE' ? 0.38 :
    featured?.status === 'APPROVED'          ? 0.58 :
    featured?.status === 'PROCESSING'        ? 0.75 :
    featured?.status === 'SHIPPED'           ? 0.90 : 0;

  const statusLabel =
    featured?.status === 'PENDING_REVIEW'    ? 'Wird geprüft' :
    featured?.status === 'PENDING_INSURANCE' ? 'Genehmigung läuft' :
    featured?.status === 'APPROVED'          ? 'Genehmigt' :
    featured?.status === 'PROCESSING'        ? 'In Vorbereitung' :
    featured?.status === 'SHIPPED'           ? 'Unterwegs' : '—';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Subtiler blauer Hintergrundglow */}
      <View style={styles.bgGlow} pointerEvents="none">
        <LinearGradient
          colors={['rgba(123,201,255,0.18)', 'rgba(247,249,252,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.begrüßung} numberOfLines={1} maxFontSizeMultiplier={1.5}>
                Hallo {benutzer?.vorname ?? 'Max'}.
              </Text>
              {featured ? (
                <Text style={styles.headerSub}>Deine Versorgung läuft.</Text>
              ) : (
                <Text style={styles.headerSub}>Willkommen bei SaniMe.</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(app)/einstellungen')}
              style={styles.avatar}
              accessibilityLabel="Profil & Einstellungen"
            >
              <Text style={styles.avatarText}>
                {(benutzer?.vorname ?? 'M')[0]}{(benutzer?.nachname ?? 'M')[0]}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {isLoading ? (
            <View style={styles.loadingBlock}>
              <View style={styles.skeleton} />
              <View style={[styles.skeleton, { height: 180, marginTop: 12 }]} />
            </View>
          ) : featured ? (
            <>
              {/* Hero Status Card */}
              <Animated.View entering={FadeInDown.delay(100).springify().damping(18)}>
                <GlassCard style={styles.heroCard} padding={24} radius={D.radius.xl}>
                  <Text style={styles.heroLabel}>AKTUELLER STATUS</Text>

                  <View style={styles.ringWrap}>
                    <CircularProgress
                      value={progressValue}
                      statusLabel={statusLabel}
                      subtitle="Wir kümmern uns darum"
                    />
                  </View>

                  <Text style={styles.heroProdukt} numberOfLines={2}>
                    {featured.produkt}
                  </Text>

                  <View style={styles.heroFooter}>
                    <Text style={styles.heroMeta}>{featured.krankenkasse}</Text>
                    <StatusBadge status={featured.status} klein />
                  </View>
                </GlassCard>
              </Animated.View>

              {/* Prozessschritte Card */}
              <Animated.View entering={FadeInDown.delay(200).springify().damping(18)}>
                <GlassCard style={styles.processCard} padding={22} radius={D.radius.lg}>
                  <Text style={styles.cardTitle}>Dein Weg zur Versorgung</Text>
                  <View style={styles.steps}>
                    {STEPS.map((step, i) => (
                      <ProcessStep
                        key={step.key}
                        label={step.label}
                        status={getStepStatus(featured.status, step.key)}
                        isLast={i === STEPS.length - 1}
                        index={i}
                        datum={getDatumForStep(featured.timeline, step.key)}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push(`/(app)/dashboard/${featured.id}`)}
                    style={styles.detailButton}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Versorgungsdetails anzeigen"
                  >
                    <Text style={styles.detailButtonText}>Details anzeigen</Text>
                    <Text style={styles.detailArrow}>›</Text>
                  </TouchableOpacity>
                </GlassCard>
              </Animated.View>

              {/* Reserviert Abstand zum schwebenden Kamera-Button in der Tab-Bar,
                  damit "Details anzeigen" nicht in dessen Tap-Bereich hineinragt. */}
              <View style={{ height: 24 }} />
            </>
          ) : (
            /* Leerer Zustand */
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <GlassCard style={styles.emptyCard} padding={36} radius={D.radius.xl}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>Noch keine Versorgung</Text>
                <Text style={styles.emptyText}>
                  Tippe auf den Scannen-Button, um dein erstes Rezept zu fotografieren.
                </Text>
              </GlassCard>
            </Animated.View>
          )}

          {/* Abgeschlossene Versorgungen */}
          {abgeschlossen.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300).springify().damping(18)}>
              <Text style={styles.sectionLabel}>Abgeschlossen</Text>
              {abgeschlossen.map((v, i) => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => router.push(`/(app)/dashboard/${v.id}`)}
                  activeOpacity={0.8}
                >
                  <GlassCard
                    style={[styles.historyCard, { marginTop: i > 0 ? 10 : 0 }]}
                    padding={16}
                    radius={D.radius.md}
                  >
                    <View style={styles.historyRow}>
                      <View style={styles.historyDot} />
                      <View style={styles.historyContent}>
                        <Text style={styles.historyName} numberOfLines={1}>{v.produkt}</Text>
                        <Text style={styles.historyMeta}>{v.krankenkasse}</Text>
                      </View>
                      <StatusBadge status={v.status} klein />
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          {/* Abstandhalter für FAB + Tab-Bar */}
          <View style={{ height: 160 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D.color.bg,
  },
  bgGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 320,
    zIndex: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
  },
  headerLeft: {
    gap: 3,
  },
  begrüßung: {
    fontSize: D.font.hero,
    fontWeight: D.font.heavy,
    color: D.color.ink,
    letterSpacing: -1.2,
    lineHeight: D.font.hero * 1.08,
  },
  headerSub: {
    fontSize: D.font.md,
    color: D.color.inkSecondary,
    fontWeight: D.font.regular,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: D.color.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(63,139,255,0.18)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: D.font.bold,
    color: D.color.accent,
  },
  heroCard: {},
  ringWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: D.font.bold,
    color: D.color.accent,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroProdukt: {
    fontSize: D.font.sm,
    color: D.color.inkSecondary,
    fontWeight: D.font.medium,
    lineHeight: 18,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  heroMeta: {
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
    fontWeight: D.font.medium,
  },
  processCard: {},
  cardTitle: {
    fontSize: D.font.lg,
    fontWeight: D.font.bold,
    color: D.color.ink,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  steps: {
    gap: 0,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(63,139,255,0.12)',
    gap: 4,
  },
  detailButtonText: {
    fontSize: D.font.md,
    fontWeight: D.font.semibold,
    color: D.color.accent,
  },
  detailArrow: {
    fontSize: 20,
    color: D.color.accent,
    lineHeight: 22,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: D.font.xl,
    fontWeight: D.font.heavy,
    color: D.color.ink,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: D.font.md,
    color: D.color.inkSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: D.font.bold,
    color: D.color.inkTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  historyCard: {},
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: D.color.success,
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
  },
  historyName: {
    fontSize: D.font.md,
    fontWeight: D.font.semibold,
    color: D.color.ink,
  },
  historyMeta: {
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
    marginTop: 2,
  },
  loadingBlock: {
    gap: 12,
  },
  skeleton: {
    height: 240,
    borderRadius: D.radius.xl,
    backgroundColor: 'rgba(63,139,255,0.07)',
  },
});
