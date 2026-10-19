import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  AccessibilityInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { Section } from '../../components/ui/Section';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { VollstaendigkeitsBadge, vollstaendigkeitsLabel } from '../../components/settings/VollstaendigkeitsBadge';
import { berechneProfilVollstaendigkeit } from '../../lib/vollstaendigkeit';
import { selectProfil, useAuthStore } from '../../store/authStore';
import type { ProfilDaten } from '../../types';
import { D } from '@sanime/design-system';

interface Entwurf {
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
  krankenkasse: string;
  versichertenNr: string;
  strasse: string;
  plz: string;
  ort: string;
}

type Fehler = Partial<Record<keyof Entwurf, string>>;

function entwurfAus(profil: ProfilDaten | null): Entwurf {
  return {
    vorname: profil?.vorname ?? '',
    nachname: profil?.nachname ?? '',
    telefon: profil?.telefon ?? '',
    email: profil?.email ?? '',
    krankenkasse: profil?.krankenkasse ?? '',
    versichertenNr: profil?.versichertenNr ?? '',
    strasse: profil?.lieferadresse?.strasse ?? '',
    plz: profil?.lieferadresse?.plz ?? '',
    ort: profil?.lieferadresse?.ort ?? '',
  };
}

/** Leere Felder sind erlaubt (sie bleiben als Aufgabe offen) — geprüft wird nur das Format
 * dessen, was eingetragen wurde. Jede Meldung nennt den nächsten Schritt. */
function pruefe(e: Entwurf): Fehler {
  const fehler: Fehler = {};
  if (e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) {
    fehler.email = 'Bitte gib eine E-Mail-Adresse wie name@beispiel.de ein.';
  }
  if (e.telefon && !/^\+?[\d\s/()-]{6,}$/.test(e.telefon)) {
    fehler.telefon = 'Bitte gib nur Ziffern ein, z. B. 0151 1234567.';
  }
  if (e.plz && !/^\d{5}$/.test(e.plz)) {
    fehler.plz = 'Die Postleitzahl hat 5 Ziffern, z. B. 10115.';
  }
  if (e.versichertenNr && !/^[A-Za-z]\d{9}$/.test(e.versichertenNr)) {
    fehler.versichertenNr = 'Die Versichertennummer steht auf deiner Karte: ein Buchstabe und 9 Ziffern.';
  }
  return fehler;
}

/** Modal „Mein Profil“ (aus den Einstellungen und der Aufgabe „Profil vervollständigen“):
 * alle Nutzerdaten an einem Ort — auch für Gäste, deren Angaben als Vorab-Profil gespeichert
 * und bei der ersten Versorgung übernommen werden (`authStore.setBenutzer`), als normales Formular mit einem Speichern-Button statt
 * Tap-to-Edit — echte Labels, logische Fokusreihenfolge, Autofill. Sheet-Modal mit
 * Schließen-Button, weil die Wischgeste allein nicht barrierefrei ist. */
export default function ProfilModal() {
  const router = useRouter();
  const benutzer = useAuthStore((s) => s.benutzer);
  const profil = useAuthStore(selectProfil);
  const aktualisiereProfil = useAuthStore((s) => s.aktualisiereProfil);

  const [entwurf, setEntwurf] = useState<Entwurf>(() => entwurfAus(profil));
  const [fehler, setFehler] = useState<Fehler>({});
  const [speichert, setSpeichert] = useState(false);

  const setze = (feld: keyof Entwurf) => (wert: string) => {
    setEntwurf((e) => ({ ...e, [feld]: wert }));
    if (fehler[feld]) setFehler((f) => ({ ...f, [feld]: undefined }));
  };

  const geaendert = JSON.stringify(entwurf) !== JSON.stringify(entwurfAus(profil));

  // Badges zeigen den Stand des Entwurfs, damit man beim Tippen sieht, was noch fehlt.
  const vorschau = berechneProfilVollstaendigkeit({
    vorname: entwurf.vorname,
    nachname: entwurf.nachname,
    telefon: entwurf.telefon,
    email: entwurf.email,
    krankenkasse: entwurf.krankenkasse,
    versichertenNr: entwurf.versichertenNr,
    lieferadresse: { strasse: entwurf.strasse, plz: entwurf.plz, ort: entwurf.ort },
  });

  const handleSpeichern = async () => {
    const t = Object.fromEntries(
      Object.entries(entwurf).map(([k, v]) => [k, v.trim()]),
    ) as unknown as Entwurf;
    const neueFehler = pruefe(t);
    setFehler(neueFehler);
    if (Object.keys(neueFehler).length > 0) {
      AccessibilityInfo.announceForAccessibility('Bitte überprüfe die markierten Felder.');
      return;
    }
    setSpeichert(true);
    await aktualisiereProfil({
      vorname: t.vorname,
      nachname: t.nachname,
      telefon: t.telefon,
      email: t.email || undefined,
      krankenkasse: t.krankenkasse || undefined,
      versichertenNr: t.versichertenNr ? t.versichertenNr.toUpperCase() : undefined,
      lieferadresse: t.strasse || t.plz || t.ort ? { strasse: t.strasse, plz: t.plz, ort: t.ort } : undefined,
    });
    setSpeichert(false);
    AccessibilityInfo.announceForAccessibility('Profil gespeichert');
    router.back();
  };

  const schliessenButton = (
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.schliessen}
      accessibilityRole="button"
      accessibilityLabel="Profil schließen"
    >
      <Feather name="x" size={22} color={D.color.ink} />
    </TouchableOpacity>
  );

  return (
    // Im iOS-Sheet gibt es keine Statusleiste über dem Inhalt; Android zeigt Modals vollflächig.
    <Screen edges={Platform.OS === 'ios' ? [] : ['top']}>
      <ScreenHeader title="Mein Profil" right={schliessenButton} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollContainer contentContainerStyle={styles.inhalt}>
          <Text style={styles.einleitung}>
            {benutzer
              ? 'Mit vollständigen Angaben können wir deine Versorgungen ohne Rückfragen bearbeiten.'
              : 'Trag deine Daten schon jetzt ein — wir übernehmen sie bei deiner ersten Versorgung, du musst sie dann nicht noch einmal eingeben.'}
          </Text>

          <Section
            titel="Persönliche Daten"
            headerRight={<VollstaendigkeitsBadge fehlend={vorschau.profil} />}
            headerAccessibilityLabel={`Persönliche Daten, ${vollstaendigkeitsLabel(vorschau.profil)}`}
            padding={16}
          >
            <View style={styles.felder}>
              <FormField label="Vorname" value={entwurf.vorname} onChangeText={setze('vorname')} autoComplete="given-name" />
              <FormField label="Nachname" value={entwurf.nachname} onChangeText={setze('nachname')} autoComplete="family-name" />
              <FormField
                label="Telefon"
                value={entwurf.telefon}
                onChangeText={setze('telefon')}
                keyboardType="phone-pad"
                autoComplete="tel"
                error={fehler.telefon}
              />
              <FormField
                label="E-Mail"
                value={entwurf.email}
                onChangeText={setze('email')}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                error={fehler.email}
              />
            </View>
          </Section>

          <Section
            titel="Krankenkasse"
            headerRight={<VollstaendigkeitsBadge fehlend={vorschau.krankenkasse} />}
            headerAccessibilityLabel={`Krankenkasse, ${vollstaendigkeitsLabel(vorschau.krankenkasse)}`}
            padding={16}
          >
            <View style={styles.felder}>
              <FormField label="Krankenkasse" value={entwurf.krankenkasse} onChangeText={setze('krankenkasse')} />
              <FormField
                label="Versichertennummer"
                value={entwurf.versichertenNr}
                onChangeText={setze('versichertenNr')}
                autoCapitalize="characters"
                accessibilityHint="Steht auf deiner Krankenkassenkarte"
                error={fehler.versichertenNr}
              />
            </View>
          </Section>

          <Section
            titel="Lieferadresse"
            headerRight={<VollstaendigkeitsBadge fehlend={vorschau.lieferung} />}
            headerAccessibilityLabel={`Lieferadresse, ${vollstaendigkeitsLabel(vorschau.lieferung)}`}
            padding={16}
          >
            <View style={styles.felder}>
              <FormField
                label="Straße & Hausnummer"
                value={entwurf.strasse}
                onChangeText={setze('strasse')}
                autoComplete="street-address"
              />
              <FormField
                label="PLZ"
                value={entwurf.plz}
                onChangeText={setze('plz')}
                keyboardType="number-pad"
                autoComplete="postal-code"
                error={fehler.plz}
              />
              <FormField label="Ort" value={entwurf.ort} onChangeText={setze('ort')} />
            </View>
          </Section>

          <Button
            label="Speichern"
            onPress={handleSpeichern}
            loading={speichert}
            disabled={!geaendert}
            accessibilityHint={geaendert ? undefined : 'Es gibt keine Änderungen zu speichern'}
            style={styles.speichern}
          />
        </ScrollContainer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inhalt: { paddingBottom: 48 },
  einleitung: {
    fontSize: D.font.md,
    color: D.color.inkSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  felder: { gap: 16 },
  speichern: { marginTop: 8 },
  schliessen: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
