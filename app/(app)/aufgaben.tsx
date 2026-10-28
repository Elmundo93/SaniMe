import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { einblenden } from '../../lib/einblenden';
import { GlassCard } from '../../components/ui/GlassCard';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import {
  LadeSkelett,
  LeerHinweis,
  StartTabScroll,
  startTabStyles,
} from '../../components/dashboard/StartTabInhalt';
import { selectProfil, useAuthStore } from '../../store/authStore';
import { useVersorgungStore } from '../../store/versorgungStore';
import { offeneAufgaben } from '../../lib/versorgungen';
import { berechneProfilVollstaendigkeit, profilAufgabeOffen } from '../../lib/vollstaendigkeit';
import { D } from '@sanime/design-system';

/** Modal „Aufgaben“ (über die Glocke im Start-Header): offene Aktionen aller laufenden
 * Versorgungen, dazu „Profil vervollständigen“, solange im Profil Angaben fehlen. Sheet-Modal mit Wisch-zum-Schließen plus Schließen-Button, weil die Geste
 * allein nicht barrierefrei ist. Liest nur — `versorgungStore` lädt `(start)/_layout.tsx`. */
export default function AufgabenModal() {
  const router = useRouter();
  const benutzer = useAuthStore((s) => s.benutzer);
  const profil = useAuthStore(selectProfil);
  const versorgungen = useVersorgungStore((s) => s.versorgungen);
  const laedt = useVersorgungStore((s) => s.laedt);
  const aufgaben = offeneAufgaben(versorgungen);
  const profilOffen = profilAufgabeOffen(profil);
  const fehlendeAngaben = berechneProfilVollstaendigkeit(profil).gesamt;

  return (
    // Im iOS-Sheet gibt es keine Statusleiste über dem Inhalt; Android zeigt Modals vollflächig.
    <Screen edges={Platform.OS === 'ios' ? [] : ['top']}>
      <ScreenHeader
        title="Aufgaben"
        right={
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.schliessen}
            accessibilityRole="button"
            accessibilityLabel="Aufgaben schließen"
          >
            <Feather name="x" size={22} color={D.color.ink} />
          </TouchableOpacity>
        }
      />
      <StartTabScroll fabAbstand={false}>
        {profilOffen && (
          <Animated.View entering={einblenden(60)}>
            <TouchableOpacity
              // Öffnet über diesem Modal — nach dem Speichern landet man wieder hier.
              onPress={() => router.push('/profil')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Profil vervollständigen — ${fehlendeAngaben} ${fehlendeAngaben === 1 ? 'Angabe fehlt' : 'Angaben fehlen'}`}
            >
              <GlassCard padding={16} radius={D.radius.md}>
                <View style={startTabStyles.zeile}>
                  <View style={[startTabStyles.punkt, { backgroundColor: D.color.warning }]} />
                  <View style={startTabStyles.zeileInhalt}>
                    <Text style={startTabStyles.zeileTitel} numberOfLines={1}>Profil vervollständigen</Text>
                    <Text style={startTabStyles.zeileMeta} numberOfLines={1}>
                      {fehlendeAngaben === 1 ? '1 Angabe fehlt' : `${fehlendeAngaben} Angaben fehlen`}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={D.color.accent} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>
        )}
        {laedt && benutzer ? (
          <LadeSkelett />
        ) : aufgaben.length === 0 ? (
          profilOffen ? null : (
          <LeerHinweis
            icon="check-circle"
            titel="Alles erledigt"
            text="Sobald wir etwas von dir brauchen, findest du es hier."
          />
          )
        ) : (
          aufgaben.map(({ versorgung, aktion }, i) => (
            <Animated.View key={aktion.id} entering={einblenden(110 + i * 50)}>
              <TouchableOpacity
                onPress={() => {
                  router.back();
                  router.push(aktion.typ === 'termin' ? `/versorgung/termin/${versorgung.id}` : `/(app)/dashboard/${versorgung.id}`);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${aktion.titel} — ${versorgung.produkt}`}
              >
                <GlassCard padding={16} radius={D.radius.md}>
                  <View style={startTabStyles.zeile}>
                    <View style={[startTabStyles.punkt, { backgroundColor: D.color.warning }]} />
                    <View style={startTabStyles.zeileInhalt}>
                      <Text style={startTabStyles.zeileTitel} numberOfLines={1}>{aktion.titel}</Text>
                      <Text style={startTabStyles.zeileMeta} numberOfLines={1}>{versorgung.produkt}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={D.color.accent} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </StartTabScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  schliessen: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
