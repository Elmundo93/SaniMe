import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { D } from '../../constants/design';

interface MiniKalenderProps {
  onAuswahl: (datum: Date) => void;
  ausgewähltesDatum?: Date | null;
}

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATSNAMEN = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function istWochenende(datum: Date) {
  const tag = datum.getDay();
  return tag === 0 || tag === 6;
}

function istGleicherTag(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Einfaches, selbstgebautes Monatsraster ohne neue Abhängigkeit — Alternative zu den
// 3 vorgeschlagenen Terminen aus lib/terminplanung.ts.
export function MiniKalender({ onAuswahl, ausgewähltesDatum }: MiniKalenderProps) {
  const heute = new Date();
  const [monatsOffset, setMonatsOffset] = useState(0);

  const anzeigeMonat = new Date(heute.getFullYear(), heute.getMonth() + monatsOffset, 1);
  const ersterWochentag = (anzeigeMonat.getDay() + 6) % 7; // Montag = 0
  const tageImMonat = new Date(anzeigeMonat.getFullYear(), anzeigeMonat.getMonth() + 1, 0).getDate();

  const zellen: (Date | null)[] = [
    ...Array(ersterWochentag).fill(null),
    ...Array.from({ length: tageImMonat }, (_, i) => new Date(anzeigeMonat.getFullYear(), anzeigeMonat.getMonth(), i + 1)),
  ];

  return (
    <View style={styles.root}>
      <View style={styles.monatsHeader}>
        <TouchableOpacity
          onPress={() => setMonatsOffset((m) => Math.max(0, m - 1))}
          disabled={monatsOffset === 0}
          hitSlop={10}
          style={styles.monatsBtn}
          accessibilityRole="button"
          accessibilityLabel="Vorheriger Monat"
        >
          <Text style={[styles.monatsBtnText, monatsOffset === 0 && styles.monatsBtnDisabled]}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monatsTitel}>
          {MONATSNAMEN[anzeigeMonat.getMonth()]} {anzeigeMonat.getFullYear()}
        </Text>
        <TouchableOpacity
          onPress={() => setMonatsOffset((m) => Math.min(2, m + 1))}
          disabled={monatsOffset === 2}
          hitSlop={10}
          style={styles.monatsBtn}
          accessibilityRole="button"
          accessibilityLabel="Nächster Monat"
        >
          <Text style={[styles.monatsBtnText, monatsOffset === 2 && styles.monatsBtnDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.wochentageRow}>
        {WOCHENTAGE.map((w) => (
          <Text key={w} style={styles.wochentagText}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {zellen.map((datum, i) => {
          if (!datum) return <View key={`leer-${i}`} style={styles.zelle} />;
          const vergangen = datum < new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
          const wochenende = istWochenende(datum);
          const deaktiviert = vergangen || wochenende;
          const ausgewählt = ausgewähltesDatum ? istGleicherTag(datum, ausgewähltesDatum) : false;

          return (
            <TouchableOpacity
              key={datum.toISOString()}
              style={[styles.zelle, ausgewählt && styles.zelleAktiv]}
              disabled={deaktiviert}
              onPress={() => onAuswahl(datum)}
              accessibilityRole="button"
              accessibilityLabel={`${datum.getDate()}. ${MONATSNAMEN[datum.getMonth()]}${deaktiviert ? ', nicht verfügbar' : ', verfügbar'}`}
              accessibilityState={{ disabled: deaktiviert, selected: ausgewählt }}
            >
              <Text style={[styles.zelleText, deaktiviert && styles.zelleTextDeaktiviert, ausgewählt && styles.zelleTextAktiv]}>
                {datum.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CELL = 44;

const styles = StyleSheet.create({
  root: { gap: 10 },
  monatsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monatsBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  monatsBtnText: { fontSize: 22, color: D.color.accent, fontWeight: D.font.bold },
  monatsBtnDisabled: { color: D.color.inkTertiary },
  monatsTitel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.ink },
  wochentageRow: { flexDirection: 'row' },
  wochentagText: { width: CELL, textAlign: 'center', fontSize: 11, color: D.color.inkTertiary, fontWeight: D.font.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  zelle: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center', borderRadius: CELL / 2 },
  zelleAktiv: { backgroundColor: D.color.accent },
  zelleText: { fontSize: D.font.sm, color: D.color.ink, fontWeight: D.font.medium },
  zelleTextDeaktiviert: { color: D.color.inkTertiary, opacity: 0.4 },
  zelleTextAktiv: { color: D.color.inkInverted, fontWeight: D.font.bold },
});
