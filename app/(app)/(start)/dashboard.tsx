import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { einblenden } from '../../../lib/einblenden';
import { GlassCard } from '../../../components/ui/GlassCard';
import { VersorgungCard } from '../../../components/dashboard/VersorgungCard';
import { AufklappAbschnitt } from '../../../components/dashboard/AufklappAbschnitt';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  LadeSkelett,
  LeerHinweis,
  StartTabScroll,
  startTabStyles,
} from '../../../components/dashboard/StartTabInhalt';
import { selectProfil, useAuthStore } from '../../../store/authStore';
import { useVersorgungStore } from '../../../store/versorgungStore';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { abgeschlosseneVersorgungen, aktiveVersorgungen, offeneAufgaben } from '../../../lib/versorgungen';
import { profilAufgabeOffen } from '../../../lib/vollstaendigkeit';
import { zeigeDispatchFehler } from '../../../lib/onboardingNav';
import { D } from '@sanime/design-system';

/** Tab „Versorgungen“: laufende Versorgungen bzw. der Einstieg in die erste, darunter
 * aufklappbar der Verlauf (gelieferte, stornierte, abgelehnte Versorgungen). */
export default function VersorgungenTab() {
  const router = useRouter();
  const benutzer = useAuthStore((s) => s.benutzer);
  const profil = useAuthStore(selectProfil);
  const versorgungen = useVersorgungStore((s) => s.versorgungen);
  const laedt = useVersorgungStore((s) => s.laedt);
  const prozessStarten = useOnboardingStore((s) => s.prozessStarten);

  const aktive = aktiveVersorgungen(versorgungen);
  const abgeschlossen = abgeschlosseneVersorgungen(versorgungen);
  // Muss mit der Liste in aufgaben.tsx übereinstimmen (Versorgungsaktionen + Profil).
  const anzahlAufgaben = offeneAufgaben(versorgungen).length + (profilAufgabeOffen(profil) ? 1 : 0);

  const scanStarten = async () => {
    const result = await prozessStarten('REZEPT');
    if (result.ok) router.push(result.route as any);
    else zeigeDispatchFehler();
  };

  const begruessung = benutzer ? `Hallo ${benutzer.vorname}` : 'Willkommen bei SaniMe';
  const unterzeile =
    aktive.length === 0
      ? begruessung
      : `${begruessung} · ${aktive.length === 1 ? '1 aktive Versorgung' : `${aktive.length} aktive Versorgungen`}`;

  return (
    <StartTabScroll>
      <Text style={styles.unterzeile} maxFontSizeMultiplier={1.5}>{unterzeile}</Text>

      {laedt && benutzer ? (
        <LadeSkelett />
      ) : aktive.length > 0 ? (
        <>
          {anzahlAufgaben > 0 && (
            <Animated.View entering={einblenden(60)}>
              <TouchableOpacity
                onPress={() => router.push('/aufgaben')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${anzahlAufgaben === 1 ? '1 offene Aufgabe' : `${anzahlAufgaben} offene Aufgaben`} ansehen`}
              >
                <GlassCard padding={16} radius={D.radius.md}>
                  <View style={startTabStyles.zeile}>
                    <View style={[startTabStyles.punkt, { backgroundColor: D.color.warning }]} />
                    <Text style={[startTabStyles.zeileTitel, startTabStyles.zeileInhalt]}>
                      {anzahlAufgaben === 1 ? '1 offene Aufgabe' : `${anzahlAufgaben} offene Aufgaben`}
                    </Text>
                    <Feather name="chevron-right" size={20} color={D.color.accent} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          )}

          {aktive.map((v, i) => (
            <Animated.View key={v.id} entering={einblenden(100 + i * 60)}>
              <VersorgungCard versorgung={v} onPress={() => router.push(`/(app)/dashboard/${v.id}`)} />
            </Animated.View>
          ))}
        </>
      ) : (
        <LeerHinweis
          icon="file-text"
          titel="Noch keine Versorgung"
          text="Fotografiere dein Rezept, den Rest übernehmen wir."
        >
          <TouchableOpacity
            style={styles.ctaButton}
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
            <Text style={styles.ctaLabel}>Jetzt Rezept scannen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.katalogLink}
            onPress={() => router.navigate('/entdecken')}
            accessibilityRole="button"
            accessibilityLabel="Ohne Rezept: Katalog durchsuchen"
          >
            <Text style={styles.katalogLinkText}>Ohne Rezept? Katalog durchsuchen</Text>
          </TouchableOpacity>
        </LeerHinweis>
      )}

      {!laedt && abgeschlossen.length > 0 && (
        <AufklappAbschnitt titel="Verlauf" icon="clock" anzahl={abgeschlossen.length}>
          {abgeschlossen.map((v) => (
            <TouchableOpacity
              key={v.id}
              onPress={() => router.push(`/(app)/dashboard/${v.id}`)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${v.produkt}, ${v.krankenkasse}`}
            >
              <GlassCard padding={16} radius={D.radius.md}>
                <View style={startTabStyles.zeile}>
                  <View style={[startTabStyles.punkt, { backgroundColor: D.color.success }]} />
                  <View style={startTabStyles.zeileInhalt}>
                    <Text style={startTabStyles.zeileTitel} numberOfLines={1}>{v.produkt}</Text>
                    <Text style={startTabStyles.zeileMeta} numberOfLines={1}>{v.krankenkasse}</Text>
                  </View>
                  <StatusBadge status={v.status} klein />
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </AufklappAbschnitt>
      )}
    </StartTabScroll>
  );
}

const styles = StyleSheet.create({
  unterzeile: {
    fontSize: D.font.md,
    color: D.color.inkSecondary,
    paddingLeft: 4,
  },
  ctaButton: {
    height: 52,
    minWidth: 220,
    marginTop: 24,
    borderRadius: D.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaLabel: {
    fontSize: D.font.md,
    fontWeight: D.font.bold,
    color: D.color.inkInverted,
  },
  katalogLink: {
    marginTop: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  katalogLinkText: {
    fontSize: D.font.sm,
    fontWeight: D.font.semibold,
    color: D.color.accent,
  },
});
