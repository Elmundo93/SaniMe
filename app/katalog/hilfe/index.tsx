import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { D, typography } from '@sanime/design-system';
import { BEDARF_KATALOG, KRANKHEITSBILD_KATALOG, type HilfeTreffer } from '@sanime/domain';
import { Screen } from '../../../components/ui/Screen';
import { ScrollContainer } from '../../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { KatalogSuchfeld } from '../../../components/katalog/KatalogSuchfeld';
import { AbschnittTitel, KatalogKarte } from '../../../components/katalog/KatalogKarten';
import * as catalogApi from '../../../lib/api/catalog';
import type { Kategorie } from '../../../lib/api/catalog';

// „Wobei brauchst du Hilfe?“ — alle Alltagsbedarfe und Krankheitsbilder in einem
// sessionlosen Discovery-Weg (ersetzt die frühere Krankheitsbild-Erfassung im
// Onboarding). Beides ist statische Domain-Taxonomie, die Liste braucht keinen
// Netzwerk-Call. Die App stellt keine Diagnose und behauptet keine Eignung —
// die Karten führen zu Produktgruppen.
export default function HilfeUebersichtScreen() {
  const router = useRouter();
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);

  useEffect(() => {
    catalogApi.listCategories().then(setKategorien).catch(() => setKategorien([]));
  }, []);

  const zuHilfe = (t: Pick<HilfeTreffer, 'typ' | 'id'>) =>
    router.push({ pathname: '/katalog/hilfe/[typ]/[id]', params: { typ: t.typ, id: t.id } });

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Wobei brauchst du Hilfe?" onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        <Text style={styles.sub}>Wähle, was am ehesten passt — oder beschreibe es in eigenen Worten, auch per Sprache.</Text>
        <KatalogSuchfeld
          kategorien={kategorien}
          placeholder="z. B. Ich komme schlecht aus dem Sessel"
          onSuche={(q) => router.push({ pathname: '/katalog/suche', params: { q } })}
          onHilfe={zuHilfe}
          onKategorie={(id) => router.push({ pathname: '/katalog/kategorie/[id]', params: { id } })}
        />

        <AbschnittTitel titel="Im Alltag" />
        {BEDARF_KATALOG.map((b, i) => (
          <KatalogKarte key={b.id} icon={b.icon} titel={b.titel} index={i} onPress={() => zuHilfe({ typ: 'bedarf', id: b.id })} />
        ))}

        <AbschnittTitel titel="Bei Erkrankungen" />
        {KRANKHEITSBILD_KATALOG.map((kb, i) => (
          <KatalogKarte
            key={kb.id}
            icon={kb.icon}
            titel={kb.bezeichnung}
            index={i}
            onPress={() => zuHilfe({ typ: 'krankheitsbild', id: kb.id })}
          />
        ))}
        <View style={styles.ende} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16, gap: 12 },
  sub: { ...typography.body, color: D.color.inkSecondary },
  ende: { height: 40 },
});
