import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { D } from '@sanime/design-system';
import { BackButton } from './BackButton';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  /** Größe von Zurück-Button UND rechtem Balance-Platzhalter (falls `right` nicht gesetzt ist). */
  backSize?: number;
  /** z.B. <StepCounter/>; ohne Angabe hält ein Platzhalter (Breite `backSize`) den Titel zentriert. */
  right?: React.ReactNode;
}

/** Konsolidiert den bisher 9x byte-identisch duplizierten Screen-Header
 * (Zurück-Button + zentrierter Titel + optionales rechtes Element, z.B. StepCounter). */
export function ScreenHeader({ title, onBack, backSize = 44, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? <BackButton onPress={onBack} size={backSize} /> : <View style={{ width: backSize }} />}
      <Text style={styles.headerTitel} numberOfLines={1}>{title}</Text>
      {right ?? <View style={{ width: backSize }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: D.color.glassBorder,
    gap: 12,
    backgroundColor: D.color.bgSoft,
  },
  headerTitel: {
    flex: 1,
    fontSize: D.font.lg,
    fontWeight: D.font.bold,
    color: D.color.ink,
    textAlign: 'center',
  },
});
