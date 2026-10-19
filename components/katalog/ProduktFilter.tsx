import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { D, typography } from '@sanime/design-system';
import { filterChipLabel, type KatalogFilterDefinition } from '@sanime/domain';

interface ProduktFilterProps {
  definitionen: KatalogFilterDefinition[];
  aktiv: Record<string, string>;
  onAendern: (aktiv: Record<string, string>) => void;
}

// Kontextabhängige Filter in Alltagssprache, als umbrechende Chips (kein
// horizontaler Scroller — der kollidiert mit der Wischgeste der Start-Tabs).
// Aktive Filter erscheinen zusätzlich als entfernbare Chips; „Alle Filter
// zurücksetzen“ ist sichtbar, sobald einer aktiv ist.
export function ProduktFilter({ definitionen, aktiv, onAendern }: ProduktFilterProps) {
  const setze = (schluessel: string, wert: string | null) => {
    const naechste = { ...aktiv };
    if (wert === null || naechste[schluessel] === wert) delete naechste[schluessel];
    else naechste[schluessel] = wert;
    onAendern(naechste);
  };
  const aktiveEintraege = Object.entries(aktiv)
    .map(([schluessel, wert]) => ({ def: definitionen.find((d) => d.schluessel === schluessel), schluessel, wert }))
    .filter((e): e is { def: KatalogFilterDefinition; schluessel: string; wert: string } => !!e.def);

  return (
    <View style={styles.wrap}>
      {aktiveEintraege.length > 0 && (
        <View style={styles.aktivReihe}>
          {aktiveEintraege.map(({ def, schluessel, wert }) => (
            <TouchableOpacity
              key={schluessel}
              onPress={() => setze(schluessel, null)}
              style={[styles.chip, styles.chipAktiv]}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${def.label}: ${filterChipLabel(def, wert)} entfernen`}
            >
              <Text style={[styles.chipText, styles.chipTextAktiv]}>{filterChipLabel(def, wert)}</Text>
              <Feather name="x" size={14} color={D.color.inkInverted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => onAendern({})} style={styles.zuruecksetzen} accessibilityRole="button">
            <Text style={styles.zuruecksetzenText}>Alle Filter zurücksetzen</Text>
          </TouchableOpacity>
        </View>
      )}

      {definitionen.map((def) => (
        <View key={def.schluessel} style={styles.gruppe}>
          <Text style={styles.label}>{def.label}</Text>
          <View style={styles.chips}>
            {optionenFuer(def).map((o) => {
              const gewaehlt = aktiv[def.schluessel] === o.wert;
              return (
                <TouchableOpacity
                  key={o.wert}
                  onPress={() => setze(def.schluessel, o.wert)}
                  style={[styles.chip, gewaehlt && styles.chipAktiv]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: gewaehlt }}
                  accessibilityLabel={`${def.label}: ${o.label}`}
                >
                  <Text style={[styles.chipText, gewaehlt && styles.chipTextAktiv]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function optionenFuer(def: KatalogFilterDefinition): { wert: string; label: string }[] {
  if (def.typ === 'bool') return [{ wert: 'true', label: def.chipLabel ?? 'Ja' }];
  if (def.typ === 'auswahl') return def.optionen ?? [];
  return (def.stufen ?? []).map((s) => ({ wert: String(s), label: filterChipLabel(def, String(s)) }));
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  aktivReihe: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  gruppe: { gap: 6 },
  label: { ...typography.caption, fontWeight: D.font.semibold, color: D.color.inkSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: 48, paddingHorizontal: 14, borderRadius: D.radius.full,
    backgroundColor: D.color.bgSoft, borderWidth: 1, borderColor: D.color.glassBorder,
  },
  chipAktiv: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  chipText: { ...typography.body, color: D.color.inkSecondary },
  chipTextAktiv: { color: D.color.inkInverted, fontWeight: D.font.semibold },
  zuruecksetzen: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 },
  zuruecksetzenText: { ...typography.body, fontWeight: D.font.semibold, color: D.color.accent },
});
