import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { D, typography } from '@sanime/design-system';
import { findeHilfe, schlageVor, type HilfeTreffer, type Vorschlag } from '@sanime/domain';
import { spracheingabeVerfuegbar, useSpracheingabe } from '../../lib/voice/spracheingabe';
import { MicButton } from '../ui/MicButton';

interface KatalogSuchfeldProps {
  /** Bereits geladene Kategorien — für Vorschläge beim Tippen (on-device, keine Anfrage pro Taste). */
  kategorien: { id: string; name: string }[];
  anfangsText?: string;
  onSuche: (text: string) => void;
  onHilfe: (treffer: HilfeTreffer) => void;
  onKategorie: (kategorieId: string) => void;
  placeholder?: string;
}

// Suche mit Mikrofon als gleichwertigem, aber immer sekundärem Weg: das
// Transkript landet sichtbar und editierbar im Textfeld, erkannte Bedarfe/
// Krankheitsbilder erscheinen als Rückfrage („Meintest du …?“) — nie eine
// automatische Navigation. Transkript und Vorschläge bleiben auf dem Gerät;
// ans Backend geht erst, was der Nutzer bestätigt (eine ID oder ein Suchtext).
export function KatalogSuchfeld({
  kategorien,
  anfangsText = '',
  onSuche,
  onHilfe,
  onKategorie,
  placeholder = 'z. B. Rollator, Duschhocker …',
}: KatalogSuchfeldProps) {
  const [text, setText] = useState(anfangsText);
  const [fokussiert, setFokussiert] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const sprache = useSpracheingabe<HilfeTreffer[]>({ matcher: findeHilfe });

  // Finales Transkript ins Textfeld übernehmen (dort prüf- und korrigierbar)
  // und den Screenreader-Fokus darauf setzen.
  useEffect(() => {
    if (sprache.status !== 'verarbeitet') return;
    // Übernahme eines externen Ergebnisses (Spracherkennung) in den Feldzustand.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(sprache.transkript);
    const knoten = findNodeHandle(inputRef.current);
    if (knoten) AccessibilityInfo.setAccessibilityFocus(knoten);
  }, [sprache.status, sprache.transkript]);

  const suchen = () => {
    const suchtext = text.trim();
    if (!suchtext) return;
    sprache.zuruecksetzen();
    onSuche(suchtext);
  };

  const vorschlagWaehlen = (v: Vorschlag) => {
    setFokussiert(false);
    if (v.typ === 'kategorie') onKategorie(v.wert);
    else if (v.typ === 'bedarf') onHilfe({ typ: 'bedarf', id: v.wert, titel: v.label, icon: '' });
    else onSuche(v.wert);
  };

  const handleMic = () => {
    if (sprache.status === 'hoert_zu') sprache.stop();
    else sprache.start();
  };

  const vorschlaege = fokussiert ? schlageVor(text, kategorien) : [];
  const rueckfrage = sprache.status === 'verarbeitet' && sprache.treffer && sprache.treffer.length > 0 ? sprache.treffer.slice(0, 3) : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.reihe}>
        <View style={styles.feld}>
          <Feather name="search" size={20} color={D.color.inkTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            onFocus={() => setFokussiert(true)}
            onBlur={() => setFokussiert(false)}
            onSubmitEditing={suchen}
            returnKeyType="search"
            placeholder={placeholder}
            placeholderTextColor={D.color.inkTertiary}
            accessibilityLabel="Katalog durchsuchen"
            accessibilityHint="Produktname, Begriff oder was du brauchst. Mit der Eingabetaste suchen."
            autoCorrect={false}
          />
          {text.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setText('');
                sprache.zuruecksetzen();
              }}
              style={styles.leeren}
              accessibilityRole="button"
              accessibilityLabel="Suchtext löschen"
            >
              <Feather name="x-circle" size={20} color={D.color.inkTertiary} />
            </TouchableOpacity>
          )}
        </View>
        {spracheingabeVerfuegbar && (
          <View style={styles.mic}>
            <MicButton
              hoertZu={sprache.status === 'hoert_zu'}
              onPress={handleMic}
              size={52}
              accessibilityLabel="Per Sprache suchen"
            />
            <Text style={styles.micLabel} importantForAccessibility="no">
              {sprache.status === 'hoert_zu' ? 'Stopp' : 'Sprechen'}
            </Text>
          </View>
        )}
      </View>

      {text.trim().length > 0 && sprache.status !== 'hoert_zu' && (
        <TouchableOpacity onPress={suchen} style={styles.suchenButton} accessibilityRole="button">
          <Text style={styles.suchenText}>Suchen</Text>
        </TouchableOpacity>
      )}

      {vorschlaege.length > 0 && (
        <View style={styles.vorschlaege} accessibilityLabel="Vorschläge">
          {vorschlaege.map((v) => (
            <TouchableOpacity
              key={`${v.typ}-${v.wert}`}
              onPress={() => vorschlagWaehlen(v)}
              style={styles.vorschlag}
              accessibilityRole="button"
              accessibilityLabel={`${v.label}, ${v.typ === 'kategorie' ? 'Kategorie' : v.typ === 'bedarf' ? 'Hilfe-Thema' : 'Suchbegriff'}`}
            >
              <Feather
                name={v.typ === 'kategorie' ? 'grid' : v.typ === 'bedarf' ? 'compass' : 'search'}
                size={16}
                color={D.color.inkSecondary}
              />
              <Text style={styles.vorschlagText}>{v.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {sprache.status === 'hoert_zu' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.hinweisBox} accessibilityLiveRegion="polite">
          <Text style={styles.hoertZu}>{sprache.transkript || 'Ich höre zu …'}</Text>
          <Text style={styles.datenschutz}>Deine Sprache wird nur auf deinem Gerät verarbeitet.</Text>
        </Animated.View>
      )}

      {sprache.status === 'fehler' && sprache.fehlerText && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.fehlerBox} accessibilityLiveRegion="polite">
          <Text style={styles.fehlerText}>{sprache.fehlerText}</Text>
        </Animated.View>
      )}

      {sprache.status === 'verarbeitet' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.hinweisBox}>
          {rueckfrage.length > 0 ? (
            <>
              <Text style={styles.rueckfrageLabel}>Meintest du …?</Text>
              {rueckfrage.map((t) => (
                <TouchableOpacity
                  key={`${t.typ}-${t.id}`}
                  onPress={() => {
                    sprache.zuruecksetzen();
                    onHilfe(t);
                  }}
                  style={styles.rueckfrageButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Ja, ${t.titel}`}
                >
                  <Text style={styles.rueckfrageText}>{t.titel}</Text>
                  <Feather name="chevron-right" size={18} color={D.color.accent} />
                </TouchableOpacity>
              ))}
              <Text style={styles.datenschutz}>Oder prüfe den Text oben und tippe auf „Suchen“.</Text>
            </>
          ) : (
            <Text style={styles.datenschutz}>Prüfe den erkannten Text oben, korrigiere ihn bei Bedarf und tippe auf „Suchen“.</Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  reihe: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  feld: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 52, paddingHorizontal: 14, borderRadius: D.radius.md,
    backgroundColor: D.color.bgSoft, borderWidth: 1, borderColor: D.color.glassBorder,
  },
  input: { flex: 1, ...typography.body, color: D.color.ink, paddingVertical: 12 },
  leeren: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  mic: { alignItems: 'center', gap: 4 },
  micLabel: { ...typography.caption, color: D.color.inkSecondary },
  suchenButton: {
    minHeight: 48, borderRadius: D.radius.md, backgroundColor: D.color.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  suchenText: { ...typography.body, fontWeight: D.font.bold, color: D.color.inkInverted },
  vorschlaege: {
    borderRadius: D.radius.md, backgroundColor: D.color.bgSoft,
    borderWidth: 1, borderColor: D.color.glassBorder, overflow: 'hidden',
  },
  vorschlag: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14 },
  vorschlagText: { ...typography.body, color: D.color.ink },
  hinweisBox: {
    backgroundColor: D.color.accentLight, borderRadius: D.radius.md, padding: 14, gap: 8,
  },
  hoertZu: { ...typography.body, color: D.color.ink, fontStyle: 'italic' },
  datenschutz: { ...typography.caption, color: D.color.inkSecondary },
  fehlerBox: { backgroundColor: D.color.errorLight, borderRadius: D.radius.md, padding: 14 },
  fehlerText: { ...typography.body, color: D.color.error },
  rueckfrageLabel: { ...typography.caption, fontWeight: D.font.bold, color: D.color.accent, textTransform: 'uppercase', letterSpacing: 0.6 },
  rueckfrageButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 48, paddingHorizontal: 14, borderRadius: D.radius.md, backgroundColor: D.color.bgSoft,
  },
  rueckfrageText: { ...typography.body, fontWeight: D.font.semibold, color: D.color.ink },
});
