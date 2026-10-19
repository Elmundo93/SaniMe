import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { D, durations } from '@sanime/design-system';

interface AufklappAbschnittProps {
  titel: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  /** Anzahl Einträge — steht als Zähler im Kopf und im Screenreader-Label. */
  anzahl: number;
  /** Ein Satz unter dem Titel, z. B. „Nur auf diesem Gerät gespeichert.“ */
  hinweis?: string;
  standardOffen?: boolean;
  children: React.ReactNode;
}

/** Aufklappbarer Listenabschnitt für die Start-Tabs (Verlauf, Gemerkt): der ganze Kopf ist
 * ein Touch-Ziel ≥ 44 pt, meldet seinen Zustand über `accessibilityState.expanded` und
 * nennt die Anzahl — so ist ohne Aufklappen hörbar, ob sich das Öffnen lohnt. Die Kinder
 * sind selbst Karten, deshalb kein zusätzlicher GlassCard-Rahmen (anders als `ui/Section`). */
export function AufklappAbschnitt({
  titel,
  icon,
  anzahl,
  hinweis,
  standardOffen = false,
  children,
}: AufklappAbschnittProps) {
  const [offen, setOffen] = useState(standardOffen);
  const drehung = useSharedValue(standardOffen ? 1 : 0);

  const umschalten = () => {
    const naechster = !offen;
    setOffen(naechster);
    drehung.value = withTiming(naechster ? 1 : 0, {
      duration: durations.fast,
      reduceMotion: ReduceMotion.System,
    });
  };

  const chevronStil = useAnimatedStyle(() => ({
    transform: [{ rotate: `${drehung.value * 180}deg` }],
  }));

  return (
    <View style={styles.container}>
      <Pressable
        onPress={umschalten}
        style={({ pressed }) => [styles.kopf, pressed && styles.kopfGedrueckt]}
        accessibilityRole="button"
        accessibilityState={{ expanded: offen }}
        accessibilityLabel={`${titel}, ${anzahl === 1 ? '1 Eintrag' : `${anzahl} Einträge`}`}
        accessibilityHint={offen ? 'Tippen zum Einklappen' : 'Tippen zum Aufklappen'}
      >
        <View style={styles.iconKreis}>
          <Feather name={icon} size={16} color={D.color.accent} />
        </View>
        <View style={styles.kopfText}>
          <Text style={styles.titel} maxFontSizeMultiplier={1.6}>{titel}</Text>
          {!!hinweis && <Text style={styles.hinweis} maxFontSizeMultiplier={1.6}>{hinweis}</Text>}
        </View>
        <View style={styles.zaehler}>
          <Text style={styles.zaehlerText} maxFontSizeMultiplier={1.4}>{anzahl}</Text>
        </View>
        <Animated.View style={chevronStil}>
          <Feather name="chevron-down" size={20} color={D.color.inkTertiary} />
        </Animated.View>
      </Pressable>

      {offen && (
        <Animated.View
          style={styles.inhalt}
          entering={FadeIn.duration(durations.fast).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(durations.fast).reduceMotion(ReduceMotion.System)}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  kopf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: D.radius.md,
  },
  kopfGedrueckt: {
    backgroundColor: D.color.accentLight,
  },
  iconKreis: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: D.color.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kopfText: {
    flex: 1,
  },
  titel: {
    fontSize: D.font.md,
    fontWeight: D.font.bold,
    color: D.color.ink,
  },
  hinweis: {
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
    marginTop: 2,
  },
  zaehler: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: D.color.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zaehlerText: {
    fontSize: D.font.sm,
    fontWeight: D.font.bold,
    color: D.color.accent,
  },
  inhalt: {
    gap: 12,
    marginTop: 8,
  },
});
