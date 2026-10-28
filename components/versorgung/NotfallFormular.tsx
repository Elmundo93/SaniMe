import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  ERREICHBARKEITEN,
  NOTFALL_GRUENDE,
  type Erreichbarkeit,
  type NotfallAnfrage,
  type NotfallGrund,
} from '@sanime/domain';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { GlassCard } from '../ui/GlassCard';
import { D } from '@sanime/design-system';

interface Props {
  // Ohne Feld (Neukunde an der Kasse) gilt die dort bestätigte Nummer.
  mitTelefon: boolean;
  telefonVorbelegt?: string;
  laedt: boolean;
  onAbsenden: (anfrage: NotfallAnfrage) => void;
}

// Grund und Erreichbarkeit als Auswahl statt Freitext: genug für den Rückruf,
// ohne dass jemand Diagnosen eintippen muss.
export function NotfallFormular({ mitTelefon, telefonVorbelegt = '', laedt, onAbsenden }: Props) {
  const [grund, setGrund] = useState<NotfallGrund | null>(null);
  const [erreichbarkeit, setErreichbarkeit] = useState<Erreichbarkeit>('GANZTAGS');
  const [telefon, setTelefon] = useState(telefonVorbelegt);

  const telefonFehlt = mitTelefon && telefon.trim().length < 6;
  const bereit = grund !== null && !telefonFehlt;

  return (
    <View style={styles.gap}>
      <Text style={styles.text}>
        Eine Lieferung vor der Genehmigung ist nicht immer möglich. Wir rufen dich an, klären die Situation und finden eine Lösung — zum
        Beispiel eine Eilgenehmigung bei deiner Krankenkasse.
      </Text>

      <Auswahl
        titel="Warum brauchst du es früher?"
        optionen={NOTFALL_GRUENDE}
        wert={grund}
        onWahl={(g) => setGrund(g)}
      />
      <Auswahl
        titel="Wann können wir dich anrufen?"
        optionen={ERREICHBARKEITEN}
        wert={erreichbarkeit}
        onWahl={(e) => setErreichbarkeit(e)}
      />

      {mitTelefon && (
        <GlassCard padding={16} radius={D.radius.md}>
          <FormField
            label="Rückrufnummer"
            value={telefon}
            onChangeText={setTelefon}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="0151 1234567"
            error={telefon && telefonFehlt ? 'Bitte gib eine vollständige Telefonnummer ein.' : undefined}
          />
        </GlassCard>
      )}

      <Button
        label="Rückruf anfragen"
        größe="lg"
        loading={laedt}
        disabled={!bereit}
        onPress={() => grund && onAbsenden({ grund, erreichbarkeit, ...(mitTelefon ? { telefon: telefon.trim() } : {}) })}
        accessibilityLabel="Rückruf für eine Notfalllieferung anfragen"
        accessibilityHint={!grund ? 'Bitte wähle zuerst einen Grund' : undefined}
      />
    </View>
  );
}

function Auswahl<K extends string>({
  titel,
  optionen,
  wert,
  onWahl,
}: {
  titel: string;
  optionen: Record<K, string>;
  wert: K | null;
  onWahl: (k: K) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={titel}>
      <Text style={styles.titel}>{titel}</Text>
      <GlassCard padding={4} radius={D.radius.md}>
        {(Object.keys(optionen) as K[]).map((k, i) => {
          const aktiv = wert === k;
          return (
            <TouchableOpacity
              key={k}
              style={[styles.option, i > 0 && styles.trenner]}
              onPress={() => onWahl(k)}
              accessibilityRole="radio"
              accessibilityState={{ selected: aktiv }}
              accessibilityLabel={optionen[k]}
            >
              <Text style={[styles.optionText, aktiv && styles.optionAktiv]}>{optionen[k]}</Text>
              <View style={[styles.kreis, aktiv && styles.kreisAktiv]}>{aktiv && <Feather name="check" size={12} color="#fff" />}</View>
            </TouchableOpacity>
          );
        })}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 18 },
  text: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 22 },
  titel: {
    fontSize: 11, fontWeight: D.font.bold, color: D.color.inkTertiary,
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8, marginLeft: 4,
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 },
  trenner: { borderTopWidth: 0.5, borderTopColor: 'rgba(63,139,255,0.12)' },
  optionText: { flex: 1, fontSize: D.font.md, color: D.color.ink },
  optionAktiv: { fontWeight: D.font.semibold },
  kreis: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(63,139,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  kreisAktiv: { backgroundColor: D.color.accent, borderColor: D.color.accent },
});
