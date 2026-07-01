import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { D } from '../../constants/design';
import type { ConfidenceLevel } from '../../types';

interface DatenFeldProps {
  label: string;
  wert: string;
  confidence?: ConfidenceLevel;
  onEdit?: (wert: string) => void;
}

// Extrahiert aus app/scan/review.tsx, damit REZEPT_PRUEFUNG und DATENPRUEFUNG dieselbe
// editierbare OCR-Feld-Darstellung (Confidence-Dot + Warnhinweis) teilen statt sie zu duplizieren.
export function DatenFeld({ label, wert, confidence, onEdit }: DatenFeldProps) {
  const [editiert, setEditiert] = useState(false);
  const [wertLokal, setWertLokal] = useState(wert);

  const konfidenzFarbe =
    confidence === 'high' ? D.color.success :
    confidence === 'medium' ? D.color.warning : D.color.error;

  const zeigeWarnung = confidence === 'low' || confidence === 'medium';

  return (
    <View style={[styles.feld, zeigeWarnung && styles.feldWarnung]}>
      <View style={styles.feldHeader}>
        <Text style={styles.feldLabel}>{label}</Text>
        {confidence && <View style={[styles.confidenceDot, { backgroundColor: konfidenzFarbe }]} />}
      </View>
      {editiert ? (
        <TextInput
          style={styles.feldInput}
          value={wertLokal}
          onChangeText={setWertLokal}
          autoFocus
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
          {zeigeWarnung && (
            <Text style={[styles.feldHinweis, { color: konfidenzFarbe }]}>
              {confidence === 'medium' ? '⚠ Bitte prüfen — KI unsicher' : '⚠ Bitte korrigieren — nicht lesbar'}
            </Text>
          )}
          {onEdit && !zeigeWarnung && <Text style={styles.feldBearbeitenHint}>Antippen zum Bearbeiten</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

export function DatenFeldGruppenTitel({ title }: { title: string }) {
  return <Text style={styles.gruppenTitel}>{title}</Text>;
}

const styles = StyleSheet.create({
  feld: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(63,139,255,0.08)',
  },
  feldWarnung: { backgroundColor: 'rgba(255,159,10,0.06)' },
  feldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  feldLabel: { fontSize: 11, color: D.color.inkTertiary, fontWeight: D.font.semibold, letterSpacing: 0.3 },
  confidenceDot: { width: 7, height: 7, borderRadius: 3.5 },
  feldWert: { fontSize: D.font.md, color: D.color.ink, fontWeight: D.font.medium },
  feldHinweis: { fontSize: 11, marginTop: 3, fontWeight: D.font.semibold },
  feldBearbeitenHint: { fontSize: 10, color: D.color.inkTertiary, marginTop: 2 },
  feldInput: {
    fontSize: D.font.md, color: D.color.ink, fontWeight: D.font.medium,
    borderBottomWidth: 2, borderBottomColor: D.color.accent, paddingVertical: 4,
  },
  gruppenTitel: {
    fontSize: 11,
    fontWeight: D.font.bold,
    color: D.color.inkTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(63,139,255,0.1)',
  },
});
