import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { StatusBadge } from '../ui/StatusBadge';
import { berechneFortschritt, naechsterSchritt } from '../../lib/versorgungProgress';
import { D } from '../../constants/design';
import type { Versorgung } from '../../types';

interface VersorgungCardProps {
  versorgung: Versorgung;
  onPress: () => void;
}

function formatDatum(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function VersorgungCard({ versorgung, onPress }: VersorgungCardProps) {
  const fortschritt = berechneFortschritt(versorgung.status);
  const naechster = naechsterSchritt(versorgung.status);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${versorgung.produkt} — Details anzeigen`}>
      <GlassCard style={styles.card} padding={18} radius={D.radius.lg}>
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>📦</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.produkt} numberOfLines={1}>{versorgung.produkt}</Text>
            {versorgung.hersteller && (
              <Text style={styles.hersteller} numberOfLines={1}>{versorgung.hersteller}</Text>
            )}
          </View>
          <StatusBadge status={versorgung.status} klein />
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(fortschritt * 100)}%` }]} />
        </View>

        {naechster && (
          <Text style={styles.naechsterSchritt}>Nächster Schritt: {naechster}</Text>
        )}

        <View style={styles.metaRow}>
          {versorgung.ansprechpartner && (
            <Text style={styles.metaText} numberOfLines={1}>👤 {versorgung.ansprechpartner}</Text>
          )}
          {versorgung.lieferzeit && (
            <Text style={styles.metaText} numberOfLines={1}>🚚 {versorgung.lieferzeit}</Text>
          )}
        </View>

        <Text style={styles.aktualisiert}>Aktualisiert am {formatDatum(versorgung.aktualisiert)}</Text>

        {versorgung.offeneAktionen.length > 0 && (
          <View style={styles.aktionBadge}>
            <Text style={styles.aktionText}>
              {versorgung.offeneAktionen.length} {versorgung.offeneAktionen.length === 1 ? 'offene Aufgabe' : 'offene Aufgaben'}
            </Text>
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: D.color.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: 18,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  produkt: {
    fontSize: D.font.md,
    fontWeight: D.font.bold,
    color: D.color.ink,
  },
  hersteller: {
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
    fontWeight: D.font.medium,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: D.color.accentLight,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: D.color.accent,
  },
  naechsterSchritt: {
    fontSize: D.font.sm,
    color: D.color.inkSecondary,
    fontWeight: D.font.medium,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  metaText: {
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
  },
  aktualisiert: {
    fontSize: D.font.xs,
    color: D.color.inkTertiary,
  },
  aktionBadge: {
    marginTop: 10,
    backgroundColor: D.color.warningLight,
    borderRadius: D.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  aktionText: {
    fontSize: D.font.xs,
    fontWeight: D.font.bold,
    color: D.color.warning,
  },
});
