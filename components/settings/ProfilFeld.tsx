import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { D } from '@sanime/design-system';

interface ProfilFeldProps {
  label: string;
  wert: string;
  ausgefuellt: boolean;
  onEdit?: (wert: string) => void;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
}

/** Tap-to-Edit-Feld mit binärer Ampel (ausgefüllt/fehlt) für Profildaten — bewusster Fork von
 * components/onboarding/DatenFeld.tsx statt Wiederverwendung: dessen dreistufige ConfidenceLevel-Texte
 * ("Bitte prüfen — KI unsicher") sind für ein schlicht leeres Profilfeld semantisch falsch. */
export function ProfilFeld({ label, wert, ausgefuellt, onEdit, keyboardType, placeholder }: ProfilFeldProps) {
  const [editiert, setEditiert] = useState(false);
  const [wertLokal, setWertLokal] = useState(wert);

  const punktFarbe = ausgefuellt ? D.color.success : D.color.warning;

  return (
    <View style={styles.feld}>
      <View style={styles.feldHeader}>
        <Text style={styles.feldLabel}>{label}</Text>
        <View
          style={[styles.punkt, { backgroundColor: punktFarbe }]}
          accessible
          accessibilityLabel={ausgefuellt ? 'ausgefüllt' : 'fehlt'}
        />
      </View>
      {editiert ? (
        <TextInput
          style={styles.feldInput}
          value={wertLokal}
          onChangeText={setWertLokal}
          autoFocus
          keyboardType={keyboardType}
          placeholder={placeholder}
          onBlur={() => { setEditiert(false); onEdit?.(wertLokal); }}
          returnKeyType="done"
          accessibilityLabel={label}
        />
      ) : (
        <TouchableOpacity
          onPress={() => onEdit && setEditiert(true)}
          disabled={!onEdit}
          activeOpacity={0.7}
          accessibilityRole={onEdit ? 'button' : undefined}
          accessibilityLabel={onEdit ? `${label}, ${wertLokal || 'leer'}, zum Bearbeiten antippen` : label}
        >
          <Text style={styles.feldWert}>{wertLokal || '—'}</Text>
          {!ausgefuellt && (
            <Text style={styles.feldHinweis}>Bitte ergänzen</Text>
          )}
          {onEdit && ausgefuellt && <Text style={styles.feldBearbeitenHint}>Antippen zum Bearbeiten</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  feld: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(63,139,255,0.08)',
  },
  feldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  feldLabel: { fontSize: 11, color: D.color.inkTertiary, fontWeight: D.font.semibold, letterSpacing: 0.3 },
  punkt: { width: 7, height: 7, borderRadius: 3.5 },
  feldWert: { fontSize: D.font.md, color: D.color.ink, fontWeight: D.font.medium },
  feldHinweis: { fontSize: 11, fontWeight: D.font.semibold, color: D.color.warning, marginTop: 3 },
  feldBearbeitenHint: { fontSize: 10, color: D.color.inkTertiary, marginTop: 2 },
  feldInput: {
    fontSize: D.font.md, color: D.color.ink, fontWeight: D.font.medium,
    borderBottomWidth: 2, borderBottomColor: D.color.accent, paddingVertical: 4,
  },
});
