import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { variantenBezeichnung, type OnboardingStatus, type ProduktDetail } from '@sanime/domain';
import { D } from '@sanime/design-system';
import { einblenden } from '../../../lib/einblenden';
import { formatEuro, anzahlText } from '../../../lib/katalogAnzeige';
import { zeigeDispatchFehler } from '../../../lib/onboardingNav';
import { GlassCard } from '../../../components/ui/GlassCard';
import { LeerHinweis, StartTabScroll } from '../../../components/dashboard/StartTabInhalt';
import { AufklappAbschnitt } from '../../../components/dashboard/AufklappAbschnitt';
import { KatalogProduktKarte } from '../../../components/produkt/KatalogProduktKarte';
import { WarenkorbZeile } from '../../../components/produkt/WarenkorbZeile';
import { STATUS_META, istLaufenderSchritt, useOnboardingStore } from '../../../store/onboardingStore';
import { useMerklisteStore } from '../../../store/merklisteStore';
import { useWarenkorbStore } from '../../../store/warenkorbStore';
import * as catalogApi from '../../../lib/api/catalog';

const LAUFENDER_SCHRITT: Partial<Record<OnboardingStatus, string>> = {
  REZEPT_AUFNAHME: 'Rezept fotografieren',
  REZEPT_PRUEFUNG: 'Rezept prüfen',
  KRANKENKASSE_AUFNAHME: 'Krankenkassenkarte fotografieren',
  DATENPRUEFUNG: 'Daten prüfen',
  VERSORGUNGSAUSWAHL: 'Versorgung auswählen',
  TERMINPLANUNG: 'Termin wählen',
};

// Produkte zu IDs einzeln laden — beide Listen sind klein und verlassen als
// Ganzes nie das Gerät; nicht mehr existierende IDs fallen raus.
function useProdukte(ids: string[]): ProduktDetail[] | null {
  const [produkte, setProdukte] = useState<ProduktDetail[] | null>(null);
  const schluessel = ids.join(',');
  useEffect(() => {
    let abgebrochen = false;
    Promise.all(ids.map((id) => catalogApi.getProduct(id).catch(() => null))).then((liste) => {
      if (!abgebrochen) setProdukte(liste.filter((p): p is NonNullable<typeof p> => !!p));
    });
    return () => {
      abgebrochen = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);
  return produkte;
}

/** Tab „Warenkorb“: die gesammelten Produkte (nur auf diesem Gerät), Kostenübersicht
 * und „Zur Kasse“ — erst dort beginnt eine Bestellung. Läuft gerade ein Schritt der
 * Bestellung (z. B. ein Rezept-Scan), steht dessen Fortsetzung oben. Darunter
 * aufklappbar die Merkliste. */
export default function WarenkorbTab() {
  const router = useRouter();
  const session = useOnboardingStore((s) => s.session);
  const prozessStarten = useOnboardingStore((s) => s.prozessStarten);
  const artikel = useWarenkorbStore((s) => s.artikel);
  const warenkorbLaden = useWarenkorbStore((s) => s.laden);
  const entfernen = useWarenkorbStore((s) => s.entfernen);
  const merkIds = useMerklisteStore((s) => s.ids);
  const merklisteLaden = useMerklisteStore((s) => s.laden);
  const [kasseLaeuft, setKasseLaeuft] = useState(false);

  useEffect(() => {
    warenkorbLaden();
    merklisteLaden();
  }, [warenkorbLaden, merklisteLaden]);

  const produkte = useProdukte(artikel.map((a) => a.produktId));
  const gemerkt = useProdukte(merkIds) ?? [];

  const laufend = session && istLaufenderSchritt(session.status) ? session : null;
  // Leerer lokaler Warenkorb, aber eine Bestellung wartet an der Kasse (z. B.
  // nach einem Neustart) — die Kasse übernimmt ihren Stand.
  const offeneKasse =
    !laufend && artikel.length === 0 && session && (session.status === 'CHECKOUT' || session.status === 'CHECKOUT_FEHLGESCHLAGEN')
      ? session
      : null;

  // Gewählte Größe je Produkt; undefined = Produkt hat Größen, aber keine ist gewählt.
  const groesse = (p: ProduktDetail): string | null | undefined => {
    if (p.varianten.length === 0) return null;
    const v = p.varianten.find((x) => x.id === artikel.find((a) => a.produktId === p.id)?.varianteId);
    return v ? variantenBezeichnung(v) : undefined;
  };
  const zurProduktseite = (id: string) => router.push({ pathname: '/katalog/produkt/[id]', params: { id } });

  const zurKasse = async () => {
    if (artikel.length === 0) return;
    const ohneGroesse = (produkte ?? []).find((p) => groesse(p) === undefined);
    if (ohneGroesse) {
      Alert.alert('Größe fehlt', `Bitte wähle für „${ohneGroesse.name}“ noch eine Größe bzw. Ausführung.`, [
        { text: 'Später', style: 'cancel' },
        { text: 'Jetzt wählen', onPress: () => zurProduktseite(ohneGroesse.id) },
      ]);
      return;
    }
    setKasseLaeuft(true);
    const result = await prozessStarten({ type: 'WARENKORB_UEBERNOMMEN', artikel, produkte: [] });
    setKasseLaeuft(false);
    if (result.ok) router.push(result.route as any);
    else zeigeDispatchFehler(result.reason);
  };

  const liste = produkte ?? [];
  const selbstzahlerSumme = liste.filter((p) => !p.hilfsmittelNr).reduce((s, p) => s + p.eigenanteil, 0);
  const kassenartikel = liste.filter((p) => p.hilfsmittelNr).length;
  const nichtBestellbar = liste.filter((p) => p.verfuegbar === false);

  return (
    <StartTabScroll>
      {laufend && (
        <Animated.View entering={einblenden(40)}>
          <GlassCard padding={16} radius={D.radius.md}>
            <TouchableOpacity
              style={styles.laufendZeile}
              onPress={() => router.push(STATUS_META[laufend.status].route as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Bestellung fortsetzen: ${LAUFENDER_SCHRITT[laufend.status]}`}
            >
              <View style={styles.laufendPunkt} />
              <View style={styles.flex}>
                <Text style={styles.laufendTitel}>Deine Bestellung wartet</Text>
                <Text style={styles.laufendText}>Weiter mit: {LAUFENDER_SCHRITT[laufend.status]}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={D.color.accent} />
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>
      )}

      {offeneKasse && (
        <Animated.View entering={einblenden(40)}>
          <GlassCard padding={16} radius={D.radius.md}>
            <TouchableOpacity
              style={styles.laufendZeile}
              onPress={() => router.push(STATUS_META[offeneKasse.status].route as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Offene Bestellung mit ${anzahlText(offeneKasse.positionen.length, 'Artikel', 'Artikeln')}, zur Kasse`}
            >
              <View style={styles.laufendPunkt} />
              <View style={styles.flex}>
                <Text style={styles.laufendTitel}>Offene Bestellung</Text>
                <Text style={styles.laufendText}>{anzahlText(offeneKasse.positionen.length, 'Artikel', 'Artikel')} · zur Kasse</Text>
              </View>
              <Feather name="chevron-right" size={20} color={D.color.accent} />
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>
      )}

      {artikel.length === 0 ? (
        !offeneKasse && (
          <LeerHinweis
            icon="shopping-cart"
            titel="Dein Warenkorb ist leer"
            text="Leg im Katalog alles hinein, was du brauchst. Ein Rezept für Kassenartikel fotografierst du erst an der Kasse."
          >
            <TouchableOpacity
              style={styles.link}
              onPress={() => router.navigate('/entdecken')}
              accessibilityRole="button"
              accessibilityLabel="Katalog entdecken"
            >
              <Text style={styles.linkText}>Katalog entdecken</Text>
            </TouchableOpacity>
          </LeerHinweis>
        )
      ) : (
        <>
          <Text style={styles.titel} accessibilityRole="header">
            {anzahlText(artikel.length, 'Artikel', 'Artikel')} im Warenkorb
          </Text>
          {produkte === null ? (
            <ActivityIndicator color={D.color.accent} accessibilityLabel="Warenkorb wird geladen" />
          ) : (
            liste.map((p, i) => (
              <Animated.View key={p.id} entering={einblenden(60 + Math.min(i, 8) * 50)}>
                <WarenkorbZeile
                  produkt={p}
                  detail={groesse(p) ? `Größe/Ausführung: ${groesse(p)}` : undefined}
                  onOeffnen={() => zurProduktseite(p.id)}
                  onEntfernen={() => entfernen(p.id)}
                  aktion={
                    groesse(p) === undefined
                      ? { label: 'Größe wählen', icon: 'maximize-2', hervorgehoben: true, onPress: () => zurProduktseite(p.id) }
                      : undefined
                  }
                />
              </Animated.View>
            ))
          )}

          <GlassCard padding={16} radius={D.radius.md}>
            <View style={styles.summeZeile}>
              <Text style={styles.summeLabel}>Bei Bestellung zu zahlen (inkl. MwSt.)</Text>
              <Text style={styles.summeWert}>{formatEuro(selbstzahlerSumme)}</Text>
            </View>
            {kassenartikel > 0 && (
              <Text style={styles.summeHinweis}>
                {anzahlText(kassenartikel, 'Kassenartikel braucht', 'Kassenartikel brauchen')} ein Rezept — das fotografierst du an der
                Kasse. Die gesetzliche Zuzahlung wird erst nach Genehmigung durch deine Krankenkasse abgerechnet. Ohne Rezept kannst
                du einen Kassenartikel an der Kasse auch zu unserem Preis selbst kaufen.
              </Text>
            )}
          </GlassCard>

          {nichtBestellbar.length > 0 && (
            <Text style={styles.fehler}>
              {nichtBestellbar.map((p) => p.name).join(', ')} {nichtBestellbar.length === 1 ? 'ist' : 'sind'} derzeit nicht
              bestellbar. Bitte entferne {nichtBestellbar.length === 1 ? 'den Artikel' : 'die Artikel'}, um zur Kasse zu gehen.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.ctaButton, (kasseLaeuft || nichtBestellbar.length > 0) && styles.ctaInaktiv]}
            onPress={zurKasse}
            disabled={kasseLaeuft || nichtBestellbar.length > 0}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Zur Kasse"
            accessibilityState={{ disabled: kasseLaeuft || nichtBestellbar.length > 0, busy: kasseLaeuft }}
          >
            <LinearGradient
              colors={[D.color.gradientTop, D.color.gradientBottom]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {kasseLaeuft ? (
              <ActivityIndicator color={D.color.inkInverted} />
            ) : (
              <>
                <Text style={styles.ctaLabel}>Zur Kasse</Text>
                <Feather name="arrow-right" size={18} color={D.color.inkInverted} />
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {gemerkt.length > 0 && (
        <AufklappAbschnitt
          titel="Gemerkt"
          icon="heart"
          anzahl={gemerkt.length}
          hinweis="Nur auf diesem Gerät gespeichert."
          standardOffen={artikel.length === 0}
        >
          {gemerkt.map((p, i) => (
            <KatalogProduktKarte
              key={p.id}
              produkt={p}
              index={i}
              onPress={() => router.push({ pathname: '/katalog/produkt/[id]', params: { id: p.id } })}
            />
          ))}
        </AufklappAbschnitt>
      )}
    </StartTabScroll>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titel: {
    fontSize: D.font.lg,
    fontWeight: D.font.bold,
    color: D.color.ink,
    paddingLeft: 4,
  },
  laufendZeile: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  laufendPunkt: { width: 8, height: 8, borderRadius: 4, backgroundColor: D.color.warning },
  laufendTitel: { fontSize: D.font.md, fontWeight: D.font.semibold, color: D.color.ink },
  laufendText: { fontSize: D.font.sm, color: D.color.inkSecondary, marginTop: 2 },
  summeZeile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summeLabel: { fontSize: D.font.md, color: D.color.inkSecondary, flex: 1 },
  summeWert: { fontSize: D.font.xl, fontWeight: D.font.heavy, color: D.color.accent },
  summeHinweis: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19, marginTop: 10 },
  fehler: { fontSize: D.font.sm, color: D.color.error, lineHeight: 19, paddingHorizontal: 4 },
  ctaButton: {
    height: 56,
    borderRadius: D.radius.lg,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaInaktiv: { opacity: 0.45 },
  ctaLabel: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.inkInverted },
  link: {
    marginTop: 18,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  linkText: {
    fontSize: D.font.sm,
    fontWeight: D.font.semibold,
    color: D.color.accent,
  },
});
