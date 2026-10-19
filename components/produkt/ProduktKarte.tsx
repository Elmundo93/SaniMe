import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { einblenden } from '../../lib/einblenden';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { GlassCard } from '../ui/GlassCard';
import { D } from '@sanime/design-system';
import type { Produkt } from '@sanime/domain';

interface ProduktKarteProps {
  produkt: Produkt;
  ausgewählt: boolean;
  onAuswählen: () => void;
  index: number;
}

// Geteilt zwischen Versorgungsauswahl (VERSORGUNGSAUSWAHL) und dem
// Katalog-Browsing (app/katalog) — ursprünglich lokal in versorgungen.tsx
// definiert. hilfsmittelNr ist optional (Selbstzahler-Artikel haben keine),
// die HiMi-Nr.-Zeile wird dann komplett ausgeblendet statt "undefined" zu zeigen.
export function ProduktKarte({ produkt, ausgewählt, onAuswählen, index }: ProduktKarteProps) {
  return (
    <Animated.View entering={einblenden(200 + index * 80)}>
      <TouchableOpacity onPress={onAuswählen} activeOpacity={0.85}>
        <GlassCard
          padding={18}
          radius={D.radius.lg}
          style={ausgewählt ? styles.cardAusgewählt : undefined}
        >
          {ausgewählt && (
            <LinearGradient
              colors={['rgba(63,139,255,0.06)', 'rgba(63,139,255,0.02)']}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Header */}
          <View style={styles.produktHeader}>
            <View style={[styles.produktIcon, ausgewählt && styles.produktIconAktiv]}>
              <Feather name="activity" size={18} color={D.color.accent} />
            </View>
            <View style={styles.produktTitelBlock}>
              <Text style={styles.produktName}>{produkt.name}</Text>
              <Text style={styles.produktHersteller}>{produkt.hersteller}</Text>
            </View>
            <View style={[styles.auswahlKreis, ausgewählt && styles.auswahlKreisAktiv]}>
              {ausgewählt && <Feather name="check" size={12} color="#fff" />}
            </View>
          </View>

          {/* HiMi-Nummer — nur bei Kassenprodukten vorhanden */}
          {produkt.hilfsmittelNr && (
            <View style={styles.himiRow}>
              <Text style={styles.himiLabel}>HiMi-Nr.</Text>
              <Text style={styles.himiWert}>{produkt.hilfsmittelNr}</Text>
            </View>
          )}
          {!produkt.hilfsmittelNr && (
            <View style={styles.selbstzahlerBadge}>
              <Text style={styles.selbstzahlerText}>Selbstzahler-Artikel</Text>
            </View>
          )}

          {/* Beschreibung */}
          <Text style={styles.beschreibung}>{produkt.beschreibung}</Text>

          {/* Merkmale */}
          <View style={styles.merkmale}>
            {produkt.merkmale.map((m) => (
              <View key={m} style={[styles.merkmalChip, ausgewählt && styles.merkmalChipAktiv]}>
                <Text style={[styles.merkmalText, ausgewählt && styles.merkmalTextAktiv]}>{m}</Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.produktFooter}>
            <View>
              <Text style={styles.eigenanteilLabel}>
                {produkt.hilfsmittelNr ? 'Gesetzl. Zuzahlung' : 'Preis'}
              </Text>
              <Text style={[styles.eigenanteilWert, ausgewählt && styles.eigenanteilWertAktiv]}>
                {produkt.eigenanteil === 0
                  ? 'Kein Eigenanteil'
                  : `${produkt.eigenanteil.toFixed(2).replace('.', ',')} €`}
              </Text>
            </View>
            <View style={styles.lieferzeitChip}>
              <Feather name="truck" size={12} color={D.color.inkSecondary} />
              <Text style={styles.lieferzeitText}>{produkt.lieferzeit}</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardAusgewählt: {
    borderWidth: 1.5,
    borderColor: D.color.accent,
    overflow: 'hidden',
    ...D.shadow.card,
    shadowColor: D.color.accent,
    shadowOpacity: 0.18,
  } as object,
  produktHeader: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  produktIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: D.color.accentLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  produktIconAktiv: { backgroundColor: 'rgba(63,139,255,0.16)' },
  produktTitelBlock: { flex: 1 },
  produktName: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.ink, lineHeight: 20 },
  produktHersteller: { fontSize: D.font.sm, color: D.color.inkSecondary, marginTop: 2 },
  auswahlKreis: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(63,139,255,0.2)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  auswahlKreisAktiv: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  himiRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  himiLabel: { fontSize: 11, color: D.color.inkTertiary, fontWeight: D.font.semibold },
  himiWert: { fontSize: 11, color: D.color.inkSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  selbstzahlerBadge: {
    alignSelf: 'flex-start', backgroundColor: D.color.accentLight,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  selbstzahlerText: { fontSize: 11, color: D.color.accent, fontWeight: D.font.semibold },
  beschreibung: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19, marginBottom: 10 },
  merkmale: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  merkmalChip: {
    backgroundColor: D.color.bgSoft, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: D.color.glassBorder,
  },
  merkmalChipAktiv: { backgroundColor: D.color.accentLight, borderColor: 'rgba(63,139,255,0.25)' },
  merkmalText: { fontSize: 11, color: D.color.inkSecondary, fontWeight: D.font.medium },
  merkmalTextAktiv: { color: D.color.accent },
  produktFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderTopWidth: 0.5, borderTopColor: 'rgba(63,139,255,0.1)', paddingTop: 12,
  },
  eigenanteilLabel: { fontSize: 11, color: D.color.inkTertiary },
  eigenanteilWert: { fontSize: D.font.xl, fontWeight: D.font.heavy, color: D.color.ink },
  eigenanteilWertAktiv: { color: D.color.accent },
  lieferzeitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: D.color.bgSoft, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: D.color.glassBorder,
  },
  lieferzeitText: { fontSize: 11, color: D.color.inkSecondary, fontWeight: D.font.medium },
});
