import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../../components/ui/GlassCard';
import { useAuthStore } from '../../../store/authStore';
import { D } from '../../../constants/design';

interface SettingsItem {
  label: string;
  wert?: string;
  icon: string;
  onPress?: () => void;
  gefährlich?: boolean;
}

function SettingsGruppe({ titel, items }: { titel: string; items: SettingsItem[] }) {
  return (
    <View style={styles.gruppe}>
      <Text style={styles.gruppeTitel}>{titel}</Text>
      <GlassCard padding={0} radius={D.radius.md}>
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
              <Text style={styles.itemIcon}>{item.icon}</Text>
            </View>
            <View style={styles.itemBody}>
              <Text style={[styles.itemLabel, item.gefährlich && styles.itemDanger]}>
                {item.label}
              </Text>
              {item.wert && <Text style={styles.itemWert} numberOfLines={1}>{item.wert}</Text>}
            </View>
            {item.onPress && (
              <Text style={styles.chevron}>›</Text>
            )}
          </TouchableOpacity>
        ))}
      </GlassCard>
    </View>
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
          router.replace('/auth/otp');
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

  const initiale =
    `${(benutzer?.vorname ?? 'M')[0]}${(benutzer?.nachname ?? 'M')[0]}`.toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Hintergrund-Glow */}
      <View style={styles.bgGlow} pointerEvents="none">
        <LinearGradient
          colors={['rgba(123,201,255,0.14)', 'rgba(247,249,252,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Großer Titel */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <Text style={styles.headerTitel}>Einstellungen</Text>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profil-Hero */}
          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
            <GlassCard style={styles.profileCard} padding={20} radius={D.radius.lg}>
              <View style={styles.avatarBig}>
                <LinearGradient
                  colors={[D.color.gradientTop, D.color.gradientBottom]}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.avatarText}>{initiale}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {benutzer?.vorname ?? 'Max'} {benutzer?.nachname ?? 'Mustermann'}
                </Text>
                <Text style={styles.profileSub}>{benutzer?.telefon ?? '+49 ···'}</Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).springify().damping(18)}>
            <SettingsGruppe
              titel="Profil"
              items={[
                { icon: '👤', label: 'Name', wert: `${benutzer?.vorname ?? ''} ${benutzer?.nachname ?? ''}`.trim() || '—' },
                { icon: '📞', label: 'Telefon', wert: benutzer?.telefon ?? '—', onPress: () => {} },
                { icon: '📧', label: 'E-Mail', wert: benutzer?.email ?? 'Nicht hinterlegt', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(190).springify().damping(18)}>
            <SettingsGruppe
              titel="Krankenkasse"
              items={[
                { icon: '🏥', label: 'Krankenkasse', wert: benutzer?.krankenkasse ?? '—', onPress: () => {} },
                { icon: '🪪', label: 'Versichertennummer', wert: benutzer?.versichertenNr ?? '—', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).springify().damping(18)}>
            <SettingsGruppe
              titel="Lieferung"
              items={[
                { icon: '📍', label: 'Lieferadresse', onPress: () => {} },
                { icon: '🧾', label: 'Rechnungsadresse', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(290).springify().damping(18)}>
            <SettingsGruppe
              titel="Benachrichtigungen"
              items={[
                { icon: '🔔', label: 'Push-Benachrichtigungen', onPress: () => {} },
                { icon: '✉️', label: 'E-Mail-Benachrichtigungen', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(340).springify().damping(18)}>
            <SettingsGruppe
              titel="Dokumente"
              items={[
                { icon: '📂', label: 'Meine Rezepte', onPress: () => {} },
                { icon: '✅', label: 'Genehmigungen', onPress: () => {} },
                { icon: '📄', label: 'Schreiben & Bescheide', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(390).springify().damping(18)}>
            <SettingsGruppe
              titel="Datenschutz"
              items={[
                { icon: '📋', label: 'Meine Einwilligungen', onPress: () => {} },
                { icon: '📥', label: 'Daten exportieren', onPress: () => {} },
                { icon: '🗑️', label: 'Daten löschen', onPress: handleDatenLöschen, gefährlich: true },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(440).springify().damping(18)}>
            <SettingsGruppe
              titel="Hilfe"
              items={[
                { icon: '❓', label: 'Häufige Fragen (FAQ)', onPress: () => {} },
                { icon: '💬', label: 'Support kontaktieren', onPress: () => {} },
                { icon: '📞', label: 'Rückruf anfordern', onPress: () => {} },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(490).springify().damping(18)}>
            <SettingsGruppe
              titel="Account"
              items={[
                { icon: '🚪', label: 'Abmelden', onPress: handleAbmelden, gefährlich: true },
              ]}
            />
          </Animated.View>

          <Animated.View entering={FadeIn.delay(600).duration(400)}>
            <Text style={styles.version}>SaniMe · Version 1.0.0</Text>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D.color.bg,
  },
  bgGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 280,
    zIndex: 0,
  },
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
  avatarBig: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: D.font.xl,
    fontWeight: D.font.heavy,
    color: '#fff',
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
  gruppe: {
    marginBottom: 20,
  },
  gruppeTitel: {
    fontSize: 11,
    fontWeight: D.font.bold,
    color: D.color.inkTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 8,
    paddingLeft: 4,
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
  itemIcon: { fontSize: 17 },
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
  chevron: {
    fontSize: 22,
    color: D.color.inkTertiary,
    lineHeight: 24,
  },
  version: {
    textAlign: 'center',
    fontSize: D.font.sm,
    color: D.color.inkTertiary,
    marginTop: 4,
    marginBottom: 8,
  },
});
