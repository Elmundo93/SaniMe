import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { einblenden } from '../../../lib/einblenden';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../../../components/ui/Avatar';
import { BackButton } from '../../../components/ui/BackButton';
import { Section } from '../../../components/ui/Section';
import { HeroGlow } from '../../../components/ui/HeroGlow';
import { Screen } from '../../../components/ui/Screen';
import { ScrollContainer } from '../../../components/ui/ScrollContainer';
import { VollstaendigkeitsBadge, vollstaendigkeitsLabel } from '../../../components/settings/VollstaendigkeitsBadge';
import { berechneProfilVollstaendigkeit } from '../../../lib/vollstaendigkeit';
import { selectProfil, useAuthStore } from '../../../store/authStore';
import { requestDataExport, getDataExport, requestDeletion } from '../../../lib/api/auth';
import { ApiError } from '../../../lib/api/client';
import { einwilligungWiderrufen, ladeEinwilligungsToken, vergesseEinwilligungsToken } from '../../../lib/einwilligung';
import { D, durations } from '@sanime/design-system';
import { pushAbmelden, pushEinstellungen } from '../../../lib/push';

const NICHT_ZUGEORDNET_HINWEIS =
  'Diese Funktion ist nur für erkannte Kunden verfügbar. Scanne deine Krankenkassenkarte, damit wir dich zuordnen können.';

function zeigeComplianceFehler(err: unknown) {
  if (err instanceof ApiError && err.status === 400) {
    Alert.alert('Noch nicht möglich', NICHT_ZUGEORDNET_HINWEIS);
    return;
  }
  Alert.alert('Das hat nicht funktioniert', 'Bitte versuche es später erneut.');
}

interface SettingsItem {
  label: string;
  wert?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  gefährlich?: boolean;
}

function SettingsGruppe({ titel, items }: { titel: string; items: SettingsItem[] }) {
  return (
    <Section titel={titel} collapsible>
      {items.map((item, i) => (
        <TouchableOpacity
          key={item.label}
          onPress={item.onPress}
          disabled={!item.onPress}
          style={[styles.item, i < items.length - 1 && styles.itemDivider]}
          accessibilityLabel={item.label}
          activeOpacity={0.6}
        >
          <View style={styles.itemIconWrap}>
            <Feather
              name={item.icon}
              size={18}
              color={item.gefährlich ? D.color.error : D.color.inkSecondary}
            />
          </View>
          <View style={styles.itemBody}>
            <Text style={[styles.itemLabel, item.gefährlich && styles.itemDanger]}>
              {item.label}
            </Text>
            {item.wert && <Text style={styles.itemWert} numberOfLines={1}>{item.wert}</Text>}
          </View>
          {item.onPress && (
            <Feather name="chevron-right" size={20} color={D.color.inkTertiary} />
          )}
        </TouchableOpacity>
      ))}
    </Section>
  );
}

type ExportStatus = 'idle' | 'requesting' | 'processing' | 'ready' | 'failed';

const EXPORT_STATUS_LABEL: Record<ExportStatus, string | undefined> = {
  idle: undefined,
  requesting: 'Wird angefordert…',
  processing: 'Wird vorbereitet…',
  ready: 'Bereit — antippen zum Herunterladen',
  failed: 'Fehlgeschlagen — erneut versuchen',
};

// Kurzes Polling statt einer echten Benachrichtigung — DataExportGenerateJobHandler
// löst heute keine Notification bei Fertigstellung aus, also ist ein Live-Status in
// dieser Sitzung die einzige Möglichkeit, das Ergebnis zu sehen. Läuft die Generierung
// länger als dieses Fenster, muss der Nutzer es später erneut antippen.
const EXPORT_POLL_INTERVALL_MS = 1500;
const EXPORT_POLL_VERSUCHE = 12;

export default function EinstellungenScreen() {
  const router = useRouter();
  const benutzer = useAuthStore((s) => s.benutzer);
  const abmelden = useAuthStore((s) => s.abmelden);

  const profil = useAuthStore(selectProfil);
  const { gesamt } = berechneProfilVollstaendigkeit(profil);
  const name = `${profil?.vorname ?? ''} ${profil?.nachname ?? ''}`.trim();

  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const exportAbgebrochen = useRef(false);

  useEffect(() => () => {
    exportAbgebrochen.current = true;
  }, []);

  // Dauerhafte Einwilligung (AGB/Datenschutz gelten bis zur nächsten
  // Textänderung) — hier sicht- und widerrufbar.
  const [einwilligungGespeichert, setEinwilligungGespeichert] = useState(false);
  useEffect(() => {
    ladeEinwilligungsToken().then((t) => setEinwilligungGespeichert(!!t));
  }, []);

  const handleEinwilligungen = () => {
    if (!einwilligungGespeichert) {
      Alert.alert(
        'Meine Einwilligungen',
        'Es ist keine dauerhafte Einwilligung gespeichert. Vor Ihrer nächsten Versorgung fragen wir AGB und Datenschutz erneut ab.',
      );
      return;
    }
    Alert.alert(
      'Meine Einwilligungen',
      'Ihre Zustimmung zu AGB und Datenschutz gilt für künftige Versorgungen, bis sich die Texte ändern. Nach einem Widerruf fragen wir vor jeder neuen Versorgung erneut. Laufende Versorgungen sind davon nicht betroffen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Widerrufen',
          style: 'destructive',
          onPress: async () => {
            try {
              await einwilligungWiderrufen();
              setEinwilligungGespeichert(false);
              Alert.alert('Widerrufen', 'Vor Ihrer nächsten Versorgung fragen wir AGB und Datenschutz erneut ab.');
            } catch {
              Alert.alert(
                'Widerruf nicht möglich',
                'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
              );
            }
          },
        },
      ],
    );
  };

  const handleAbmelden = () => {
    Alert.alert('Abmelden', 'Möchten Sie sich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          // Solange der Token noch gilt: dieses Gerät abmelden.
          await pushAbmelden();
          await abmelden();
          // Ein anderer Mensch könnte dieses Gerät weiter nutzen — die
          // gespeicherte Einwilligung nur lokal vergessen (kein Widerruf).
          await vergesseEinwilligungsToken();
          router.dismissTo('/dashboard');
        },
      },
    ]);
  };

  const handleDatenExportieren = async () => {
    if (exportStatus === 'ready' && exportDownloadUrl) {
      Linking.openURL(exportDownloadUrl);
      return;
    }
    setExportStatus('requesting');
    try {
      const created = await requestDataExport();
      setExportStatus('processing');
      for (let versuch = 0; versuch < EXPORT_POLL_VERSUCHE; versuch++) {
        await new Promise((r) => setTimeout(r, EXPORT_POLL_INTERVALL_MS));
        if (exportAbgebrochen.current) return;
        const detail = await getDataExport(created.id);
        if (detail.status === 'ready' && detail.downloadUrl) {
          setExportDownloadUrl(detail.downloadUrl);
          setExportStatus('ready');
          return;
        }
        if (detail.status === 'failed') {
          setExportStatus('failed');
          return;
        }
      }
      // Noch nicht fertig nach dem Poll-Fenster — kein Fehler, nur noch nicht bereit.
      setExportStatus('idle');
      Alert.alert(
        'Export wird vorbereitet',
        'Das dauert länger als erwartet. Bitte versuche es in ein paar Minuten erneut.',
      );
    } catch (err) {
      setExportStatus('idle');
      zeigeComplianceFehler(err);
    }
  };

  const handleDatenLöschen = () => {
    Alert.alert(
      'Daten löschen',
      'Alle Ihre Daten unwiderruflich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Endgültig löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await requestDeletion(null);
              Alert.alert(
                'Anfrage gesendet',
                'Ihre Löschanfrage wurde übermittelt. Wir melden uns innerhalb von 72 Stunden.',
              );
            } catch (err) {
              zeigeComplianceFehler(err);
            }
          },
        },
      ],
    );
  };

  const initiale = `${profil?.vorname?.charAt(0) ?? ''}${profil?.nachname?.charAt(0) ?? ''}`.toUpperCase() || '?';

  return (
    <Screen background={<HeroGlow />}>
        {/* Großer Titel */}
        <Animated.View entering={FadeIn.duration(durations.slow)} style={styles.header}>
          <BackButton onPress={() => router.back()} style={styles.zurueck} />
          <Text style={styles.headerTitel}>Einstellungen</Text>
        </Animated.View>

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          {/* Alle Nutzerdaten liegen gesammelt im Modal „Mein Profil“. */}
          <Animated.View entering={einblenden(140)}>
            <Section titel="Profil">
              <TouchableOpacity
                onPress={() => router.push('/profil')}
                style={styles.item}
                accessibilityRole="button"
                accessibilityLabel={`Mein Profil, ${name || 'Name fehlt'}, ${vollstaendigkeitsLabel(gesamt)}`}
                activeOpacity={0.6}
              >
                <Avatar initials={initiale} size={40} />
                <View style={styles.itemBody}>
                  <Text style={styles.itemLabel}>Mein Profil</Text>
                  <Text style={styles.itemWert} numberOfLines={1}>
                    {name || 'Jetzt Daten eintragen'}
                  </Text>
                </View>
                <VollstaendigkeitsBadge fehlend={gesamt} />
                <Feather name="chevron-right" size={20} color={D.color.inkTertiary} />
              </TouchableOpacity>
            </Section>
          </Animated.View>

          <Animated.View entering={einblenden(290)}>
            <SettingsGruppe
              titel="Benachrichtigungen"
              items={[
                { icon: 'bell', label: 'Push-Benachrichtigungen', onPress: () => pushEinstellungen(!!benutzer) },
              ]}
            />
          </Animated.View>

          <Animated.View entering={einblenden(390)}>
            <SettingsGruppe
              titel="Datenschutz"
              items={[
                {
                  icon: 'clipboard',
                  label: 'Meine Einwilligungen',
                  wert: einwilligungGespeichert ? 'Dauerhaft erteilt' : undefined,
                  onPress: handleEinwilligungen,
                },
                {
                  icon: 'download',
                  label: 'Daten exportieren',
                  wert: EXPORT_STATUS_LABEL[exportStatus],
                  onPress: exportStatus === 'requesting' || exportStatus === 'processing' ? undefined : handleDatenExportieren,
                },
                { icon: 'trash-2', label: 'Daten löschen', onPress: handleDatenLöschen, gefährlich: true },
              ]}
            />
          </Animated.View>

          <Animated.View entering={einblenden(440)}>
            <SettingsGruppe
              titel="Hilfe"
              items={[
                { icon: 'help-circle', label: 'Häufige Fragen (FAQ)', onPress: () => {} },
                { icon: 'message-circle', label: 'Support kontaktieren', onPress: () => {} },
                { icon: 'phone', label: 'Rückruf anfordern', onPress: () => {} },
              ]}
            />
          </Animated.View>

          {benutzer && (
            <Animated.View entering={einblenden(490)}>
              <Section titel="Account">
                <TouchableOpacity
                  onPress={handleAbmelden}
                  style={styles.item}
                  accessibilityLabel="Abmelden"
                  activeOpacity={0.6}
                >
                  <View style={styles.itemIconWrap}>
                    <Feather name="log-out" size={18} color={D.color.error} />
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemLabel, styles.itemDanger]}>Abmelden</Text>
                  </View>
                </TouchableOpacity>
              </Section>
            </Animated.View>
          )}

          <Animated.View entering={FadeIn.delay(600).duration(400)}>
            <Text style={styles.version}>SaniMe · Version 1.0.0</Text>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  zurueck: {
    marginLeft: -10,
    marginBottom: 4,
  },
  headerTitel: {
    fontSize: D.font.hero,
    fontWeight: D.font.heavy,
    color: D.color.ink,
    letterSpacing: -1.2,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 52,
    gap: 12,
  },
  itemDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(63,139,255,0.1)',
  },
  itemIconWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, gap: 2 },
  itemLabel: {
    fontSize: D.font.md,
    fontWeight: D.font.medium,
    color: D.color.ink,
  },
  itemDanger: { color: D.color.error },
  itemWert: {
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
  },
  version: {
    textAlign: 'center',
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
    marginTop: 4,
    marginBottom: 8,
  },
});
