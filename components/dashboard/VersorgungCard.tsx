import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { Colors } from '../../constants/colors';
import type { Versorgung } from '../../types';

interface VersorgungCardProps {
  versorgung: Versorgung;
  onPress: () => void;
}

function formatDatum(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function VersorgungCard({ versorgung, onPress }: VersorgungCardProps) {
  const letzterSchritt = versorgung.timeline
    .filter((t) => t.abgeschlossen)
    .at(-1);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.produkt} numberOfLines={1}>
            {versorgung.produkt}
          </Text>
          <StatusBadge status={versorgung.status} klein />
        </View>

        <Text style={styles.meta}>
          {versorgung.krankenkasse} · {versorgung.arzt}
        </Text>

        {letzterSchritt && (
          <View style={styles.letzerSchritt}>
            <View style={styles.dot} />
            <Text style={styles.letzerSchrittText}>
              {letzterSchritt.label} · {formatDatum(letzterSchritt.zeitpunkt)}
            </Text>
          </View>
        )}

        {versorgung.offeneAktionen.length > 0 && (
          <View style={styles.aktionBadge}>
            <Text style={styles.aktionText}>
              {versorgung.offeneAktionen.length} Aktion erforderlich
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  produkt: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  meta: {
    fontSize: 13,
    color: Colors.inkSecondary,
    marginBottom: 10,
  },
  letzerSchritt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  letzerSchrittText: {
    fontSize: 13,
    color: Colors.inkSecondary,
  },
  aktionBadge: {
    marginTop: 10,
    backgroundColor: Colors.warningBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  aktionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
});
