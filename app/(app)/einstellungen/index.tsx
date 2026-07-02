import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
import { useAuthStore } from '../../../store/authStore';
import { D, durations } from '@sanime/design-system';

interface SettingsItem {
  label: string;
  wert?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  gefährlich?: boolean;
}

function SettingsGruppe({ titel, items }: { titel: string; items: SettingsItem[] }) {
  return (
    <Section titel={titel}>
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

export default function EinstellungenScreen() {
  const router = useRouter();
  const benutzer = useAuthStore((s) => s.benutzer);
  const abmelden = useAuthStore((s) => s.abmelden);

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

  const handleDatenLöschen = () => {
    Alert.alert(
      'Daten löschen',
      'Alle Ihre Daten unwiderruflich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Endgültig löschen',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Anfrage gesendet',
              'Ihre Löschanfrage wurde übermittelt. Wir melden uns innerhalb von 72 Stunden.',
            ),
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

          <Animated.View entering={FadeInDown.delay(140).springify().damping(18)}>
            <SettingsGruppe
              titel="Profil"
              items={[
                { icon: 'user', label: 'Name', wert: `${benutzer?.vorname ?? ''} ${benutzer?.nachname ?? ''}`.trim() || '—' },
                { icon: 'phone', label: 'Telefon', wert: benutzer?.telefon ?? '—', onPress: () => {} },
                { icon: 'mail', label: 'E-Mail', wert: benutzer?.email ?? 'Nicht hinterlegt', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(190).springify().damping(18)}>
            <SettingsGruppe
              titel="Krankenkasse"
              items={[
                { icon: 'shield', label: 'Krankenkasse', wert: benutzer?.krankenkasse ?? '—', onPress: () => {} },
                { icon: 'credit-card', label: 'Versichertennummer', wert: benutzer?.versichertenNr ?? '—', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).springify().damping(18)}>
            <SettingsGruppe
              titel="Lieferung"
              items={[
                { icon: 'map-pin', label: 'Lieferadresse', onPress: () => {} },
                { icon: 'file-text', label: 'Rechnungsadresse', onPress: () => {} },
              ]}
            />
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
                { icon: 'download', label: 'Daten exportieren', onPress: () => {} },
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
              <SettingsGruppe
                titel="Account"
                items={[
                  { icon: 'log-out', label: 'Abmelden', onPress: handleAbmelden, gefährlich: true },
                ]}
              />
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
