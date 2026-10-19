import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { D, neutral, typography } from '@sanime/design-system';
import type { QaEintrag } from '@sanime/domain';
import { GlassCard } from '../ui/GlassCard';

interface QaListeProps {
  eintraege: QaEintrag[];
  onOeffnen: (eintrag: QaEintrag) => void;
  /** Sichtbar ohne „Alle Fragen“ (Detailseite: 3). */
  max?: number;
}

// Ratgeber-Fragen als aufklappbare Liste: zugeklappt die Frage, aufgeklappt die
// Kurzantwort plus Link zum vollständigen Eintrag (mit Quellen und Prüfdatum).
export function QaListe({ eintraege, onOeffnen, max }: QaListeProps) {
  const [alle, setAlle] = useState(false);
  const [offen, setOffen] = useState<string | null>(null);
  const sichtbar = max && !alle ? eintraege.slice(0, max) : eintraege;

  return (
    <GlassCard padding={0} radius={D.radius.lg}>
      {sichtbar.map((e, i) => {
        const aufgeklappt = offen === e.id;
        return (
          <View key={e.id} style={[styles.eintrag, i > 0 && styles.trenner]}>
            <TouchableOpacity
              onPress={() => setOffen(aufgeklappt ? null : e.id)}
              style={styles.frageZeile}
              accessibilityRole="button"
              accessibilityState={{ expanded: aufgeklappt }}
              accessibilityLabel={e.frage}
            >
              <Text style={styles.frage}>{e.frage}</Text>
              <Feather name={aufgeklappt ? 'chevron-up' : 'chevron-down'} size={20} color={D.color.inkTertiary} />
            </TouchableOpacity>
            {aufgeklappt && (
              <View style={styles.antwort}>
                {!!e.kurzantwort && <Text style={styles.kurzantwort}>{e.kurzantwort}</Text>}
                <TouchableOpacity onPress={() => onOeffnen(e)} style={styles.link} accessibilityRole="link">
                  <Text style={styles.linkText}>Ganze Antwort lesen</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
      {max !== undefined && !alle && eintraege.length > max && (
        <TouchableOpacity onPress={() => setAlle(true)} style={[styles.link, styles.alle]} accessibilityRole="button">
          <Text style={styles.linkText}>Alle {eintraege.length} Fragen anzeigen</Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  eintrag: { paddingHorizontal: 16 },
  trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: neutral.separator },
  frageZeile: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 12 },
  frage: { ...typography.body, fontWeight: D.font.semibold, color: D.color.ink, flex: 1 },
  antwort: { paddingBottom: 12, gap: 6 },
  kurzantwort: { ...typography.body, color: D.color.inkSecondary },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { ...typography.body, fontWeight: D.font.semibold, color: D.color.accent },
  alle: { paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: neutral.separator },
});
