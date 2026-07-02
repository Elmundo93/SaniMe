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
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { VersorgungCard } from '../../../components/dashboard/VersorgungCard';
import { useAuthStore } from '../../../store/authStore';
import { useVersorgungStore } from '../../../store/versorgungStore';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { D } from '../../../constants/design';

export default function DashboardScreen() {
  const router = useRouter();
  const benutzer = useAuthStore((s) => s.benutzer);
  const { versorgungen, laden, zuruecksetzen } = useVersorgungStore();
  const starten = useOnboardingStore((s) => s.starten);
  const [isLoading, setIsLoading] = React.useState(true);

  const scanStarten = async () => {
    await starten();
    router.push('/scan/rezept');
  };

  useEffect(() => {
    // Ohne benutzer (ausgeloggt / noch nicht per Archiv-Abgleich erkannt) darf hier
    // keine Versorgungshistorie eines fremden Kunden aufscheinen.
    if (!benutzer) {
      zuruecksetzen();
      setIsLoading(false);
      return;
    }
    laden().finally(() => setIsLoading(false));
  }, [benutzer, laden, zuruecksetzen]);

  const aktive = versorgungen.filter(
    (v) => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(v.status),
  );
  const abgeschlossen = versorgungen.filter((v) =>
    ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(v.status),
  );
  const offeneAufgaben = aktive.flatMap((v) =>
    v.offeneAktionen.map((aktion) => ({ versorgung: v, aktion })),
  );

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
                {benutzer ? `Hallo ${benutzer.vorname}.` : 'Willkommen.'}
              </Text>
              {aktive.length > 0 ? (
                <Text style={styles.headerSub}>
                  {aktive.length === 1 ? '1 aktive Versorgung' : `${aktive.length} aktive Versorgungen`}
                </Text>
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
                {benutzer ? `${benutzer.vorname[0]}${benutzer.nachname[0]}` : '?'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {isLoading ? (
            <View style={styles.loadingBlock}>
              <View style={styles.skeleton} />
              <View style={[styles.skeleton, { height: 180, marginTop: 12 }]} />
            </View>
          ) : aktive.length > 0 ? (
            <>
              {offeneAufgaben.length > 0 && (
                <Animated.View entering={FadeInDown.delay(100).springify().damping(18)}>
                  <Text style={styles.sectionLabel}>Offene Aufgaben</Text>
                  {offeneAufgaben.map(({ versorgung, aktion }, i) => (
                    <TouchableOpacity
                      key={aktion.id}
                      onPress={() => router.push(`/(app)/dashboard/${versorgung.id}`)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`${aktion.titel} — ${versorgung.produkt}`}
                    >
                      <GlassCard
                        style={[styles.aufgabeCard, { marginTop: i > 0 ? 10 : 0 }]}
                        padding={16}
                        radius={D.radius.md}
                      >
                        <View style={styles.aufgabeRow}>
                          <View style={styles.aufgabeDot} />
                          <View style={styles.historyContent}>
                            <Text style={styles.historyName} numberOfLines={1}>{aktion.titel}</Text>
                            <Text style={styles.historyMeta} numberOfLines={1}>{versorgung.produkt}</Text>
                          </View>
                          <Text style={styles.detailArrow}>›</Text>
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}

              <Text style={styles.sectionLabel}>Deine Versorgungen</Text>
              {aktive.map((v, i) => (
                <Animated.View key={v.id} entering={FadeInDown.delay(150 + i * 60).springify().damping(18)}>
                  <VersorgungCard versorgung={v} onPress={() => router.push(`/(app)/dashboard/${v.id}`)} />
                </Animated.View>
              ))}

              {/* Reserviert Abstand zum schwebenden Kamera-Button in der Tab-Bar. */}
              <View style={{ height: 24 }} />
            </>
          ) : (
            /* Leerer Zustand */
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <GlassCard style={styles.emptyCard} padding={36} radius={D.radius.xl}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>Noch keine Versorgung</Text>
                <Text style={styles.emptyText}>
                  Fotografiere dein Rezept, den Rest übernehmen wir.
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={scanStarten}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Jetzt Rezept scannen"
                >
                  <LinearGradient
                    colors={[D.color.gradientTop, D.color.gradientBottom]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.emptyButtonLabel}>Jetzt Rezept scannen</Text>
                </TouchableOpacity>
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
    marginBottom: 24,
  },
  emptyButton: {
    height: 52,
    minWidth: 220,
    borderRadius: D.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyButtonLabel: {
    fontSize: D.font.md,
    fontWeight: D.font.bold,
    color: D.color.inkInverted,
  },
  aufgabeCard: {},
  aufgabeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aufgabeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: D.color.warning,
    flexShrink: 0,
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
