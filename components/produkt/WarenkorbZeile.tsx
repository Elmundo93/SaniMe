import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { D } from '@sanime/design-system';
import type { Produkt } from '@sanime/domain';
import { formatEuro } from '../../lib/katalogAnzeige';
import { GlassCard } from '../ui/GlassCard';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export type RezeptStatus = 'fehlt' | 'erfasst' | 'nicht-noetig' | 'ohne-rezept';

interface WarenkorbZeileProps {
  produkt: Produkt;
  /** Ohne Angabe: Kassenartikel zeigen „Rezept nötig“, Selbstzahler den Preis. */
  rezeptStatus?: RezeptStatus;
  /** Zusatzzeile unter dem Namen, z. B. das erkannte Hilfsmittel vom Rezept. */
  detail?: string;
  onOeffnen?: () => void;
  onEntfernen?: () => void;
  /** Aktion unter der Zeile, z. B. „Rezept fotografieren“ im Checkout. */
  aktion?: ZeilenAktion;
  /** Zweite, schwächer gewichtete Aktion, z. B. „Ohne Rezept kaufen“. */
  nebenAktion?: ZeilenAktion;
}

interface ZeilenAktion {
  label: string;
  /** Eindeutiges Screenreader-Label; ohne Angabe „label: Produktname“. */
  a11yLabel?: string;
  icon: FeatherName;
  onPress: () => void;
  hervorgehoben?: boolean;
}

function kostenText(produkt: Produkt, status: RezeptStatus): string {
  if (status === 'ohne-rezept') return `${formatEuro(produkt.selbstzahlerPreis ?? 0)}, ohne Rezept`;
  if (produkt.hilfsmittelNr) {
    const mitRezept = produkt.eigenanteil > 0 ? `Mit Rezept: Zuzahlung bis ${formatEuro(produkt.eigenanteil)}` : 'Mit Rezept: Kassenleistung';
    return produkt.selbstzahlerPreis !== undefined ? `${mitRezept} · ohne Rezept ${formatEuro(produkt.selbstzahlerPreis)}` : mitRezept;
  }
  return produkt.eigenanteil > 0 ? formatEuro(produkt.eigenanteil) : 'Kostenlos';
}

const REZEPT_TEXT: Record<RezeptStatus, { text: string; icon: FeatherName; farbe: string } | null> = {
  fehlt: { text: 'Rezept fehlt', icon: 'alert-circle', farbe: D.color.warning },
  erfasst: { text: 'Rezept erfasst', icon: 'check-circle', farbe: D.color.success },
  'nicht-noetig': null,
  'ohne-rezept': { text: 'Ohne Rezept, du zahlst selbst', icon: 'credit-card', farbe: D.color.inkSecondary },
};

// Eine Position im Warenkorb bzw. in der Bestellübersicht der Kasse. Antippen
// (Name) öffnet das Produkt, Entfernen und Zusatzaktion sind eigene, je
// mindestens 44 pt große Touch-Ziele mit eindeutigem Screenreader-Label.
export function WarenkorbZeile({ produkt, rezeptStatus, detail, onOeffnen, onEntfernen, aktion, nebenAktion }: WarenkorbZeileProps) {
  const status = rezeptStatus ?? (produkt.hilfsmittelNr ? 'fehlt' : 'nicht-noetig');
  const rezept = REZEPT_TEXT[status];
  const kosten = kostenText(produkt, status);
  const a11yLabel = [produkt.name, kosten, rezept?.text, detail].filter(Boolean).join('. ');

  const inhalt = (
    <View style={styles.zeile}>
      <View style={styles.bild}>
        <Feather name={(produkt.kategorieIcon ?? 'package') as FeatherName} size={22} color={D.color.accent} />
      </View>
      <View style={styles.texte}>
        <Text style={styles.name} numberOfLines={2}>{produkt.name}</Text>
        <Text style={styles.kosten}>{kosten}</Text>
        {rezept && (
          <View style={styles.rezeptZeile}>
            <Feather name={rezept.icon} size={14} color={rezept.farbe} />
            <Text style={[styles.rezeptText, { color: rezept.farbe }]}>{rezept.text}</Text>
          </View>
        )}
        {!!detail && <Text style={styles.detail} numberOfLines={2}>{detail}</Text>}
      </View>
    </View>
  );

  return (
    <GlassCard padding={14} radius={D.radius.lg}>
      <View style={styles.kopf}>
        {onOeffnen ? (
          <TouchableOpacity
            style={styles.flex}
            onPress={onOeffnen}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            accessibilityHint="Öffnet die Produktdetails"
          >
            {inhalt}
          </TouchableOpacity>
        ) : (
          <View style={styles.flex} accessible accessibilityLabel={a11yLabel}>
            {inhalt}
          </View>
        )}
        {onEntfernen && (
          <TouchableOpacity
            style={styles.entfernen}
            onPress={onEntfernen}
            accessibilityRole="button"
            accessibilityLabel={`${produkt.name} aus dem Warenkorb entfernen`}
          >
            <Feather name="trash-2" size={20} color={D.color.inkTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {aktion && <AktionKnopf aktion={aktion} produktName={produkt.name} />}
      {nebenAktion && <AktionKnopf aktion={nebenAktion} produktName={produkt.name} neben />}
    </GlassCard>
  );
}

function AktionKnopf({ aktion, produktName, neben }: { aktion: ZeilenAktion; produktName: string; neben?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.aktion, aktion.hervorgehoben && styles.aktionHervorgehoben, neben && styles.nebenAktion]}
      onPress={aktion.onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={aktion.a11yLabel ?? `${aktion.label}: ${produktName}`}
    >
      <Feather name={aktion.icon} size={18} color={aktion.hervorgehoben ? D.color.inkInverted : D.color.accent} />
      <Text style={[styles.aktionText, aktion.hervorgehoben && styles.aktionTextHervorgehoben]}>{aktion.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  kopf: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  zeile: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bild: {
    width: 44,
    height: 44,
    borderRadius: D.radius.md,
    backgroundColor: D.color.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texte: { flex: 1, gap: 2 },
  name: { fontSize: D.font.md, fontWeight: D.font.semibold, color: D.color.ink },
  kosten: { fontSize: D.font.sm, color: D.color.inkSecondary },
  rezeptZeile: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rezeptText: { fontSize: D.font.sm, fontWeight: D.font.semibold },
  detail: { fontSize: D.font.sm, color: D.color.inkTertiary, marginTop: 2 },
  entfernen: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -6 },
  aktion: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: D.color.accent,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  aktionHervorgehoben: { backgroundColor: D.color.accent },
  nebenAktion: { marginTop: 8, borderWidth: 0 },
  aktionText: { fontSize: D.font.sm, fontWeight: D.font.bold, color: D.color.accent },
  aktionTextHervorgehoben: { color: D.color.inkInverted },
});
