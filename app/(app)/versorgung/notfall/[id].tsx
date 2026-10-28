import React, { useState } from 'react';
import { Alert, AccessibilityInfo, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { NotfallAnfrage } from '@sanime/domain';
import { Screen } from '../../../../components/ui/Screen';
import { ScreenHeader } from '../../../../components/ui/ScreenHeader';
import { ScrollContainer } from '../../../../components/ui/ScrollContainer';
import { NotfallFormular } from '../../../../components/versorgung/NotfallFormular';
import { notfallAnfragen } from '../../../../lib/api/supply';
import { ApiError } from '../../../../lib/api/client';
import { selectProfil, useAuthStore } from '../../../../store/authStore';
import { useVersorgungStore } from '../../../../store/versorgungStore';
import { D } from '@sanime/design-system';

// Notfalllieferung für eine laufende Versorgung: es entsteht nur eine
// Rückrufbitte — zugesagt wird am Telefon, nicht in der App.
export default function NotfallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const telefon = useAuthStore((s) => selectProfil(s)?.telefon ?? '');
  const laden = useVersorgungStore((s) => s.laden);
  const [laedt, setLaedt] = useState(false);

  const absenden = async (anfrage: NotfallAnfrage) => {
    setLaedt(true);
    try {
      await notfallAnfragen(id, anfrage);
      await laden();
      AccessibilityInfo.announceForAccessibility('Rückruf angefragt');
      router.back();
    } catch (e) {
      const text =
        e instanceof ApiError && e.status < 500
          ? e.message
          : 'Wir konnten deine Anfrage gerade nicht senden. Bitte prüfe deine Internetverbindung und versuche es noch einmal.';
      Alert.alert('Anfrage nicht gesendet', text);
    } finally {
      setLaedt(false);
    }
  };

  return (
    // Im iOS-Sheet gibt es keine Statusleiste über dem Inhalt; Android zeigt Modals vollflächig.
    <Screen edges={Platform.OS === 'ios' ? [] : ['top']}>
      <ScreenHeader
        title="Früher benötigt?"
        right={
          <TouchableOpacity onPress={() => router.back()} style={styles.schliessen} accessibilityRole="button" accessibilityLabel="Schließen">
            <Feather name="x" size={22} color={D.color.ink} />
          </TouchableOpacity>
        }
      />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        <NotfallFormular mitTelefon telefonVorbelegt={telefon} laedt={laedt} onAbsenden={absenden} />
        <View style={{ height: 40 }} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16 },
  schliessen: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
