import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import TopTabs, { type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../components/navigation/AppHeader';
import { StartTabBar, type StartTabConfig } from '../../../components/navigation/StartTabBar';
import { CameraButton } from '../../../components/ui/CameraButton';
import { HeroGlow } from '../../../components/ui/HeroGlow';
import { selectProfil, useAuthStore } from '../../../store/authStore';
import { useVersorgungStore } from '../../../store/versorgungStore';
import { offeneAufgaben } from '../../../lib/versorgungen';
import { profilAufgabeOffen } from '../../../lib/vollstaendigkeit';
import { D } from '@sanime/design-system';

const FAB_SIZE = 72;

/** Start-Ansicht: Header (Glocke · Logo · Einstellungen), swipebare Top-Tabs
 * (Versorgungen / Katalog / Warenkorb) und der schwebende Kamera-Button für eine neue
 * Versorgung. Lädt die Versorgungshistorie einmal für die Tabs und das Aufgaben-Modal. */
export default function StartLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const benutzer = useAuthStore((s) => s.benutzer);
  const profil = useAuthStore(selectProfil);
  const { versorgungen, laden, zuruecksetzen } = useVersorgungStore();
  // Muss mit der Liste in aufgaben.tsx übereinstimmen (Versorgungsaktionen + Profil).
  const anzahlAufgaben = offeneAufgaben(versorgungen).length + (profilAufgabeOffen(profil) ? 1 : 0);

  useEffect(() => {
    // Ohne benutzer (ausgeloggt / noch nicht per Archiv-Abgleich erkannt) darf hier
    // keine Versorgungshistorie eines fremden Kunden aufscheinen.
    if (!benutzer) {
      zuruecksetzen();
      return;
    }
    // Ein Netzwerk-/Serverfehler soll den leeren Zustand zeigen statt eines
    // Absturzes — laden() wirft nur noch bei einem echten Fehler (403 für
    // eine nicht zugeordnete Sitzung wird bereits intern zu [] gemappt).
    laden().catch(() => {});
  }, [benutzer, laden, zuruecksetzen]);

  const tabs: StartTabConfig[] = [
    { name: 'dashboard', titel: 'Versorgungen', icon: 'package' },
    // Offene Aufgaben zählt allein die Glocke — Katalog ist der Katalog-Start.
    { name: 'entdecken', titel: 'Katalog', icon: 'grid' },
    { name: 'warenkorb', titel: 'Warenkorb', icon: 'shopping-cart' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <HeroGlow />
      <SafeAreaView edges={['top']} style={styles.flex}>
        <AppHeader
          benachrichtigungen={anzahlAufgaben}
          onBenachrichtigungen={() => router.push('/aufgaben')}
          onEinstellungen={() => router.push('/(app)/einstellungen')}
        />
        <TopTabs
          tabBar={(props: MaterialTopTabBarProps) => <StartTabBar {...props} configs={tabs} />}
          screenOptions={{
            swipeEnabled: true,
            lazy: false,
            sceneStyle: { backgroundColor: 'transparent' },
          }}
          initialRouteName="dashboard"
        >
          <TopTabs.Screen name="dashboard" options={{ title: 'Versorgungen' }} />
          <TopTabs.Screen name="entdecken" options={{ title: 'Katalog' }} />
          <TopTabs.Screen name="warenkorb" options={{ title: 'Warenkorb' }} />
        </TopTabs>
      </SafeAreaView>

      <View
        style={[styles.fabWrap, { bottom: Math.max(insets.bottom, 16) + 8 }]}
        pointerEvents="box-none"
      >
        <CameraButton onPress={() => router.push('/einstieg')} size={FAB_SIZE} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D.color.bg,
  },
  flex: {
    flex: 1,
  },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
