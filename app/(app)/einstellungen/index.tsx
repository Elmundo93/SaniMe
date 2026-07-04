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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Avatar } from '../../../components/ui/Avatar';
import { Section } from '../../../components/ui/Section';
import { HeroGlow } from '../../../components/ui/HeroGlow';
import { Screen } from '../../../components/ui/Screen';
import { ScrollContainer } from '../../../components/ui/ScrollContainer';
import { ProfilFeld } from '../../../components/settings/ProfilFeld';
import { VollstaendigkeitsBadge, vollstaendigkeitsLabel } from '../../../components/settings/VollstaendigkeitsBadge';
import { berechneProfilVollstaendigkeit } from '../../../lib/vollstaendigkeit';
import { useAuthStore } from '../../../store/authStore';
import { requestDataExport, getDataExport, requestDeletion } from '../../../lib/api/auth';
import { ApiError } from '../../../lib/api/client';
import { D, durations } from '@sanime/design-system';

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
  const aktualisiereBenutzer = useAuthStore((s) => s.aktualisiereBenutzer);

  const { profil, krankenkasse, lieferung } = berechneProfilVollstaendigkeit(benutzer);

  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const exportAbgebrochen = useRef(false);

  useEffect(() => () => {
    exportAbgebrochen.current = true;
  }, []);

  const bearbeitenOnEdit = (feld: (wert: string) => void) => (benutzer ? feld : undefined);

  const handleAbmelden = () => {
    Alert.alert('Abmelden', 'Möchten Sie sich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await abmelden();
          router.replace('/(app)/dashboard');
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

  const initiale = benutzer
    ? `${benutzer.vorname[0]}${benutzer.nachname[0]}`.toUpperCase()
    : '?';

  return (
    <Screen background={<HeroGlow />}>
        {/* Großer Titel */}
        <Animated.View entering={FadeIn.duration(durations.slow)} style={styles.header}>
          <Text style={styles.headerTitel}>Einstellungen</Text>
        </Animated.View>

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          {/* Profil-Hero */}
          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
            <GlassCard style={styles.profileCard} padding={20} radius={D.radius.lg}>
              <Avatar initials={initiale} size={60} fontSize={D.font.xl} variant="gradient" />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {benutzer ? `${benutzer.vorname} ${benutzer.nachname}` : 'Gast'}
                </Text>
                <Text style={styles.profileSub}>
                  {benutzer?.telefon ?? 'Noch nicht erkannt'}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Profil */}
          <Animated.View entering={FadeInDown.delay(140).springify().damping(18)}>
            <Section
              titel="Profil"
              collapsible
              headerRight={<VollstaendigkeitsBadge fehlend={profil} />}
              headerAccessibilityLabel={`Profil, ${vollstaendigkeitsLabel(profil)}`}
            >
              <ProfilFeld
                label="Vorname"
                wert={benutzer?.vorname ?? ''}
                ausgefuellt={Boolean(benutzer?.vorname)}
                onEdit={bearbeitenOnEdit((wert) => aktualisiereBenutzer({ vorname: wert }))}
              />
              <ProfilFeld
                label="Nachname"
                wert={benutzer?.nachname ?? ''}
                ausgefuellt={Boolean(benutzer?.nachname)}
                onEdit={bearbeitenOnEdit((wert) => aktualisiereBenutzer({ nachname: wert }))}
              />
              <ProfilFeld
                label="Telefon"
                wert={benutzer?.telefon ?? ''}
                ausgefuellt={Boolean(benutzer?.telefon)}
                keyboardType="phone-pad"
                onEdit={bearbeitenOnEdit((wert) => aktualisiereBenutzer({ telefon: wert }))}
              />
              <ProfilFeld
                label="E-Mail"
                wert={benutzer?.email ?? ''}
                ausgefuellt={Boolean(benutzer?.email)}
                keyboardType="email-address"
                onEdit={bearbeitenOnEdit((wert) => aktualisiereBenutzer({ email: wert }))}
              />
            </Section>
          </Animated.View>

          {/* Krankenkasse */}
          <Animated.View entering={FadeInDown.delay(190).springify().damping(18)}>
            <Section
              titel="Krankenkasse"
              collapsible
              headerRight={<VollstaendigkeitsBadge fehlend={krankenkasse} />}
              headerAccessibilityLabel={`Krankenkasse, ${vollstaendigkeitsLabel(krankenkasse)}`}
            >
              <ProfilFeld
                label="Krankenkasse"
                wert={benutzer?.krankenkasse ?? ''}
                ausgefuellt={Boolean(benutzer?.krankenkasse)}
                onEdit={bearbeitenOnEdit((wert) => aktualisiereBenutzer({ krankenkasse: wert }))}
              />
              <ProfilFeld
                label="Versichertennummer"
                wert={benutzer?.versichertenNr ?? ''}
                ausgefuellt={Boolean(benutzer?.versichertenNr)}
                onEdit={bearbeitenOnEdit((wert) => aktualisiereBenutzer({ versichertenNr: wert }))}
              />
            </Section>
          </Animated.View>

          {/* Lieferung */}
          <Animated.View entering={FadeInDown.delay(240).springify().damping(18)}>
            <Section
              titel="Lieferung"
              collapsible
              headerRight={<VollstaendigkeitsBadge fehlend={lieferung} />}
              headerAccessibilityLabel={`Lieferung, ${vollstaendigkeitsLabel(lieferung)}`}
            >
              <ProfilFeld
                label="Straße & Hausnummer"
                wert={benutzer?.lieferadresse?.strasse ?? ''}
                ausgefuellt={Boolean(benutzer?.lieferadresse?.strasse)}
                onEdit={bearbeitenOnEdit((wert) =>
                  aktualisiereBenutzer({
                    lieferadresse: { ...(benutzer?.lieferadresse ?? { strasse: '', plz: '', ort: '' }), strasse: wert },
                  }),
                )}
              />
              <ProfilFeld
                label="PLZ"
                wert={benutzer?.lieferadresse?.plz ?? ''}
                ausgefuellt={Boolean(benutzer?.lieferadresse?.plz)}
                keyboardType="numeric"
                onEdit={bearbeitenOnEdit((wert) =>
                  aktualisiereBenutzer({
                    lieferadresse: { ...(benutzer?.lieferadresse ?? { strasse: '', plz: '', ort: '' }), plz: wert },
                  }),
                )}
              />
              <ProfilFeld
                label="Ort"
                wert={benutzer?.lieferadresse?.ort ?? ''}
                ausgefuellt={Boolean(benutzer?.lieferadresse?.ort)}
                onEdit={bearbeitenOnEdit((wert) =>
                  aktualisiereBenutzer({
                    lieferadresse: { ...(benutzer?.lieferadresse ?? { strasse: '', plz: '', ort: '' }), ort: wert },
                  }),
                )}
              />
              <TouchableOpacity onPress={() => {}} style={styles.item} accessibilityLabel="Rechnungsadresse" activeOpacity={0.6}>
                <View style={styles.itemIconWrap}>
                  <Feather name="file-text" size={18} color={D.color.inkSecondary} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemLabel}>Rechnungsadresse</Text>
                </View>
                <Feather name="chevron-right" size={20} color={D.color.inkTertiary} />
              </TouchableOpacity>
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(290).springify().damping(18)}>
            <SettingsGruppe
              titel="Benachrichtigungen"
              items={[
                { icon: 'bell', label: 'Push-Benachrichtigungen', onPress: () => {} },
                { icon: 'mail', label: 'E-Mail-Benachrichtigungen', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(340).springify().damping(18)}>
            <SettingsGruppe
              titel="Dokumente"
              items={[
                { icon: 'folder', label: 'Meine Rezepte', onPress: () => {} },
                { icon: 'check-circle', label: 'Genehmigungen', onPress: () => {} },
                { icon: 'file', label: 'Schreiben & Bescheide', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(390).springify().damping(18)}>
            <SettingsGruppe
              titel="Datenschutz"
              items={[
                { icon: 'clipboard', label: 'Meine Einwilligungen', onPress: () => {} },
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

          <Animated.View entering={FadeInDown.delay(440).springify().damping(18)}>
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
            <Animated.View entering={FadeInDown.delay(490).springify().damping(18)}>
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
    paddingTop: 8,
    paddingBottom: 14,
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: D.font.lg,
    fontWeight: D.font.bold,
    color: D.color.ink,
    letterSpacing: -0.3,
  },
  profileSub: {
    fontSize: D.font.sm,
    color: D.color.inkSecondary,
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
