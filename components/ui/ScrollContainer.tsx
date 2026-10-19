import React from 'react';
import { ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { D } from '@sanime/design-system';

interface ScrollContainerProps {
  contentContainerStyle?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

/** Standard-Scroll-Hülle: ersetzt die in fast jedem Screen wiederholte
 * `<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={...}>`-Boilerplate. */
export function ScrollContainer({ contentContainerStyle, children }: ScrollContainerProps) {
  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      // Ohne das schließt der erste Tap auf ein anderes Feld/einen Button nur die
      // Tastatur (Layout springt, zweiter Tap nötig) — siehe DatenFeld.
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: D.space.md,
  },
});
