import React, { useState } from 'react';
import { View, Image, ScrollView, StyleSheet, useWindowDimensions, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { D, typography } from '@sanime/design-system';
import type { ProduktBild } from '@sanime/domain';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface ProduktGalerieProps {
  bilder: ProduktBild[];
  /** Kategorie-Icon als Platzhalter, solange es keine lizenzierten Fotos gibt. */
  platzhalterIcon?: string;
  produktName: string;
}

// Horizontales Paging, jedes Bild mit Pflicht-alt-Text. Ohne Bilder ein
// einheitlicher Icon-Platzhalter — bewusst keine Stockfotos, die ein konkretes
// Produkt vortäuschen würden (Katalogplan §4.2).
export function ProduktGalerie({ bilder, platzhalterIcon, produktName }: ProduktGalerieProps) {
  const { width } = useWindowDimensions();
  const [seite, setSeite] = useState(0);
  const breite = width - 32;

  if (bilder.length === 0) {
    return (
      <View
        style={[styles.platzhalter, { width: breite }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Symbolbild für ${produktName} — noch kein Produktfoto vorhanden`}
      >
        <Feather name={(platzhalterIcon ?? 'package') as FeatherName} size={56} color={D.color.accent} />
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setSeite(Math.round(e.nativeEvent.contentOffset.x / breite))}
        style={{ width: breite }}
      >
        {bilder.map((bild) => (
          <Image
            key={bild.url}
            source={{ uri: bild.url }}
            style={[styles.bild, { width: breite }]}
            accessible
            accessibilityLabel={bild.altText}
            resizeMode="contain"
          />
        ))}
      </ScrollView>
      {bilder.length > 1 && (
        <Text style={styles.zaehler} accessibilityLiveRegion="polite">
          Bild {seite + 1} von {bilder.length}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  platzhalter: {
    height: 180, borderRadius: D.radius.lg, backgroundColor: D.color.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  bild: { height: 240, borderRadius: D.radius.lg, backgroundColor: D.color.bgSoft },
  zaehler: { ...typography.caption, color: D.color.inkSecondary, textAlign: 'center', marginTop: 6 },
});
