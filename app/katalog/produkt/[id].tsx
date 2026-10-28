import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { D, typography } from '@sanime/design-system';
import { variantenBezeichnung, type PassendeProdukte, type Produkt, type ProduktDetail, type QaEintrag } from '@sanime/domain';
import { Screen } from '../../../components/ui/Screen';
import { ScrollContainer } from '../../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Section } from '../../../components/ui/Section';
import { GlassCard } from '../../../components/ui/GlassCard';
import { QaListe } from '../../../components/katalog/QaListe';
import { AbschnittTitel, KatalogHinweis, KatalogLaden, KATALOG_LADEFEHLER } from '../../../components/katalog/KatalogKarten';
import { ProduktGalerie } from '../../../components/produkt/ProduktGalerie';
import { PassendesZubehoer, hatPassende } from '../../../components/produkt/PassendesZubehoer';
import * as catalogApi from '../../../lib/api/catalog';
import * as qaApi from '../../../lib/api/qa';
import { istBestellbar, kostenhinweis, verfuegbarkeitText } from '../../../lib/katalogAnzeige';
import { useMerklisteStore } from '../../../store/merklisteStore';
import { useWarenkorbStore } from '../../../store/warenkorbStore';

// „Passt das zu mir?“ — strukturierte Attribute in Alltagssprache. Nur Fakten,
// keine Eignungsbehauptung („eignet sich für Menschen mit …“).
function eigenschaftText(schluessel: string, wert: string | number | boolean): string | null {
  const zahl = typeof wert === 'number' ? String(wert).replace('.', ',') : String(wert);
  switch (schluessel) {
    case 'gewichtKg':
      return `Wiegt ${zahl} kg`;
    case 'belastbarkeitKg':
      return `Trägt bis ${zahl} kg Körpergewicht`;
    case 'faltbar':
      return wert ? 'Lässt sich zusammenklappen' : 'Nicht zusammenklappbar';
    case 'hoehenverstellbar':
      return wert ? 'Höhe einstellbar' : 'Feste Höhe';
    case 'rueckenlehne':
      return wert ? 'Mit Rückenlehne' : 'Ohne Rückenlehne';
    case 'sitzbreiteCm':
      return `Sitzbreite ${zahl} cm`;
    case 'einsatzort': {
      const orte = String(wert).split(',');
      if (orte.includes('innen') && orte.includes('aussen')) return 'Für drinnen und draußen';
      return orte.includes('aussen') ? 'Für draußen gedacht' : 'Für drinnen gedacht';
    }
    default:
      return null;
  }
}

// Produktdetailseite mit fester Reihenfolge: Übersicht → „Passt das zu mir?“ →
// Zubehör → Technische Informationen (aufklappbar, hier steht die HiMi-Nr.) →
// Häufige Fragen. Genau eine Primär-CTA, sticky unten: „In den Warenkorb“ —
// legt das Produkt nur lokal ab; einen Prozess (Session + Einwilligung) beginnt
// erst „Zur Kasse“ im Warenkorb. Liegt es schon drin, führt sie dorthin.
export default function ProduktScreen() {
  const router = useRouter();
  const { id, krankheitsbildId } = useLocalSearchParams<{ id: string; krankheitsbildId?: string }>();
  const [produkt, setProdukt] = useState<ProduktDetail | null>(null);
  const [fehler, setFehler] = useState(false);
  // Größe/Ausführung: bestimmt, was geliefert wird, und welches Zubehör passt.
  // Liegt das Produkt schon im Warenkorb, ist dessen Auswahl vorbelegt.
  const imKorbVariante = useWarenkorbStore((s) => s.artikel.find((a) => a.produktId === id)?.varianteId);
  const [auswahl, setVariantId] = useState<string | undefined>(undefined);
  const variantId = auswahl ?? imKorbVariante;
  const [passende, setPassende] = useState<PassendeProdukte | null>(null);
  const [ratgeber, setRatgeber] = useState<QaEintrag[]>([]);
  const [auswahlLaeuft, setAuswahlLaeuft] = useState(false);
  const imWarenkorb = useWarenkorbStore((s) => s.artikel.some((a) => a.produktId === id));
  const warenkorbHinzufuegen = useWarenkorbStore((s) => s.hinzufuegen);
  const warenkorbLaden = useWarenkorbStore((s) => s.laden);
  const gemerkt = useMerklisteStore((s) => s.ids.includes(id));
  const merkenUmschalten = useMerklisteStore((s) => s.umschalten);
  const merklisteLaden = useMerklisteStore((s) => s.laden);

  useEffect(() => {
    merklisteLaden();
    warenkorbLaden();
    let abgebrochen = false;
    catalogApi
      .getProduct(id)
      .then((p) => !abgebrochen && setProdukt(p))
      .catch(() => !abgebrochen && setFehler(true));
    qaApi
      .listQa({ productId: id })
      .then((r) => !abgebrochen && setRatgeber(r))
      .catch(() => !abgebrochen && setRatgeber([]));
    return () => {
      abgebrochen = true;
    };
  }, [id, merklisteLaden, warenkorbLaden]);

  useEffect(() => {
    let abgebrochen = false;
    catalogApi
      .listRelated(id, variantId)
      .then((r) => !abgebrochen && setPassende(r))
      .catch(() => !abgebrochen && setPassende(null));
    return () => {
      abgebrochen = true;
    };
  }, [id, variantId]);

  const zuProdukt = (p: Produkt) => router.push({ pathname: '/katalog/produkt/[id]', params: { id: p.id } });

  const mussWaehlen = !!produkt && produkt.varianten.length > 0;
  const auswahlFehlt = mussWaehlen && !variantId;
  // Im Warenkorb, aber mit anderer Größe gewählt → die CTA ändert die Auswahl.
  const auswahlGeaendert = imWarenkorb && mussWaehlen && !!variantId && variantId !== imKorbVariante;
  const gewaehlt = produkt?.varianten.find((v) => v.id === variantId);
  const ctaText = auswahlGeaendert
    ? `Auswahl ändern: ${gewaehlt ? variantenBezeichnung(gewaehlt) : ''}`
    : imWarenkorb
      ? 'Im Warenkorb · Zum Warenkorb'
      : 'In den Warenkorb';

  const handleWarenkorb = async () => {
    if (!produkt || auswahlFehlt) return;
    if (imWarenkorb && !auswahlGeaendert) {
      router.navigate('/warenkorb' as any);
      return;
    }
    setAuswahlLaeuft(true);
    try {
      const ok = await warenkorbHinzufuegen({ produktId: produkt.id, krankheitsbildId, varianteId: variantId });
      if (ok) {
        const groesse = gewaehlt ? `, ${variantenBezeichnung(gewaehlt)}` : '';
        AccessibilityInfo.announceForAccessibility(`${produkt.name}${groesse} liegt jetzt im Warenkorb`);
      } else {
        Alert.alert('Dein Warenkorb ist voll', 'Bitte schließe zuerst eine Bestellung ab oder entferne einen Artikel aus dem Warenkorb.');
      }
    } finally {
      setAuswahlLaeuft(false);
    }
  };

  const merkenButton = (
    <TouchableOpacity
      onPress={() => merkenUmschalten(id)}
      style={styles.merken}
      accessibilityRole="button"
      accessibilityState={{ selected: gemerkt }}
      accessibilityLabel={gemerkt ? 'Von der Merkliste entfernen' : 'Merken'}
      accessibilityHint="Die Merkliste bleibt nur auf diesem Gerät"
    >
      <Feather name="heart" size={22} color={gemerkt ? D.color.error : D.color.inkSecondary} />
    </TouchableOpacity>
  );

  if (fehler) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Produkt" onBack={() => router.back()} />
        <KatalogHinweis icon="wifi-off" text={KATALOG_LADEFEHLER} aktion={{ label: 'Zurück', onPress: () => router.back() }} />
      </Screen>
    );
  }
  if (!produkt) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Produkt" onBack={() => router.back()} />
        <KatalogLaden />
      </Screen>
    );
  }

  const kosten = kostenhinweis(produkt);
  const bestellbar = istBestellbar(produkt);
  const eigenschaften = Object.entries(produkt.attribute)
    .map(([k, v]) => eigenschaftText(k, v))
    .filter((t): t is string => !!t);
  const technik: [string, string][] = [
    ['Hersteller', produkt.hersteller],
    ['Kategorie', produkt.kategorie],
    ...(produkt.artikelnummer ? [['Artikelnummer', produkt.artikelnummer] as [string, string]] : []),
    ...(produkt.hilfsmittelNr ? [['Hilfsmittelnummer', produkt.hilfsmittelNr] as [string, string]] : []),
    ['Genehmigung der Kasse nötig', produkt.hilfsmittelNr ? (produkt.requiresApproval ? 'Ja' : 'Nein') : 'Entfällt (Selbstzahler)'],
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Produkt" onBack={() => router.back()} right={merkenButton} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        {/* 1. Übersicht */}
        <ProduktGalerie bilder={produkt.bilder} platzhalterIcon={produkt.kategorieIcon} produktName={produkt.name} />
        <Text style={styles.name} accessibilityRole="header">
          {produkt.name}
        </Text>
        <Text style={styles.nutzen}>{produkt.kurzbeschreibung ?? produkt.beschreibung}</Text>
        {produkt.merkmale.length > 0 && (
          <View style={styles.merkmale}>
            {produkt.merkmale.slice(0, 4).map((m) => (
              <View key={m} style={styles.merkmal}>
                <Feather name="check" size={16} color={D.color.success} accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={styles.merkmalText}>{m}</Text>
              </View>
            ))}
          </View>
        )}
        <GlassCard padding={16} radius={D.radius.lg}>
          <Text style={styles.kostenTitel}>{kosten.titel}</Text>
          {!!kosten.detail && <Text style={styles.kostenDetail}>{kosten.detail}</Text>}
          <View style={styles.verfuegbarkeit}>
            <Feather
              name={bestellbar ? 'truck' : 'slash'}
              size={16}
              color={bestellbar ? D.color.inkSecondary : D.color.error}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={[styles.kostenDetail, !bestellbar && styles.nichtBestellbar]}>{verfuegbarkeitText(produkt)}</Text>
          </View>
        </GlassCard>

        {/* 2. Passt das zu mir? */}
        <AbschnittTitel titel="Passt das zu mir?" />
        <Text style={styles.text}>{produkt.beschreibung}</Text>
        {eigenschaften.map((e) => (
          <View key={e} style={styles.merkmal}>
            <Feather name="info" size={16} color={D.color.accent} accessibilityElementsHidden importantForAccessibility="no" />
            <Text style={styles.merkmalText}>{e}</Text>
          </View>
        ))}
        {produkt.varianten.length > 0 && (
          <View style={styles.varianten}>
            <Text style={styles.variantenLabel} accessibilityRole="header">
              Größe bzw. Ausführung wählen
            </Text>
            <Text style={styles.variantenHinweis}>Bestimmt, was wir liefern und welches Zubehör passt.</Text>
            <View style={styles.variantenChips}>
              {produkt.varianten.map((v) => {
                const aktiv = v.id === variantId;
                const label = variantenBezeichnung(v);
                return (
                  // „button“ statt „radio“: iOS kennt keinen Radio-Trait, VoiceOver
                  // würde den Chip sonst nicht als bedienbar ansagen.
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setVariantId(v.id)}
                    style={[styles.chip, aktiv && styles.chipAktiv]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: aktiv }}
                    accessibilityLabel={label}
                    accessibilityHint="Wählt diese Größe bzw. Ausführung"
                  >
                    <Text style={[styles.chipText, aktiv && styles.chipTextAktiv]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 3. Passendes Zubehör — ausgeblendet, wenn es keines gibt */}
        {hatPassende(passende) && (
          <>
            <AbschnittTitel titel="Passendes Zubehör" />
            <PassendesZubehoer passende={passende} onProdukt={zuProdukt} />
          </>
        )}

        {/* 4. Technische Informationen */}
        <Section titel="Technische Informationen" collapsible defaultExpanded={false} padding={16}>
          {technik.map(([label, wert]) => (
            <View key={label} style={styles.technikZeile}>
              <Text style={styles.technikLabel}>{label}</Text>
              <Text style={[styles.technikWert, label === 'Hilfsmittelnummer' && styles.mono]}>{wert}</Text>
            </View>
          ))}
        </Section>

        {/* 5. Häufige Fragen */}
        {ratgeber.length > 0 && (
          <>
            <AbschnittTitel titel="Häufige Fragen" />
            <QaListe
              eintraege={ratgeber}
              max={3}
              onOeffnen={(e) => router.push({ pathname: '/katalog/ratgeber/[id]', params: { id: e.slug } })}
            />
          </>
        )}
        <Text style={styles.platzhalter}>
          {/Platzhalter/.test(produkt.name)
            ? 'Platzhalter-Produktdaten während der Entwicklung.'
            : 'Herstellerneutral beschrieben: Die Marke kann je nach Lieferung abweichen, die genannten Merkmale gelten.'}
        </Text>
      </ScrollContainer>

      <View style={styles.ctaLeiste}>
        {!bestellbar && <Text style={styles.ctaGrund}>Dieses Produkt ist derzeit nicht bestellbar. Schau dir gern ähnliche Produkte in der Kategorie an.</Text>}
        {bestellbar && auswahlFehlt && <Text style={styles.ctaHinweis}>Bitte wähle zuerst oben eine Größe bzw. Ausführung.</Text>}
        {bestellbar && !!produkt.hilfsmittelNr && (
          <Text style={styles.ctaHinweis}>Für diesen Artikel brauchst du ein Rezept. Das fotografierst du an der Kasse.</Text>
        )}
        <TouchableOpacity
          style={[
            styles.cta,
            imWarenkorb && !auswahlGeaendert && styles.ctaImWarenkorb,
            (!bestellbar || auswahlLaeuft || auswahlFehlt) && styles.ctaInaktiv,
          ]}
          onPress={handleWarenkorb}
          disabled={!bestellbar || auswahlLaeuft || auswahlFehlt}
          accessibilityRole="button"
          accessibilityState={{ disabled: !bestellbar || auswahlLaeuft || auswahlFehlt, busy: auswahlLaeuft }}
          accessibilityLabel={ctaText.replace(' · ', '. ')}
        >
          {auswahlLaeuft ? (
            <ActivityIndicator color={D.color.inkInverted} />
          ) : (
            <View style={styles.ctaInhalt}>
              <Feather
                name={imWarenkorb && !auswahlGeaendert ? 'check' : 'shopping-cart'}
                size={18}
                color={imWarenkorb && !auswahlGeaendert ? D.color.accent : D.color.inkInverted}
              />
              <Text style={[styles.ctaText, imWarenkorb && !auswahlGeaendert && styles.ctaTextImWarenkorb]}>{ctaText}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16, gap: 12, paddingBottom: 32 },
  merken: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.title, color: D.color.ink },
  nutzen: { ...typography.body, color: D.color.inkSecondary },
  text: { ...typography.body, color: D.color.ink },
  merkmale: { gap: 6 },
  merkmal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  merkmalText: { ...typography.body, color: D.color.ink, flex: 1 },
  kostenTitel: { ...typography.headline, color: D.color.ink },
  kostenDetail: { ...typography.body, color: D.color.inkSecondary },
  verfuegbarkeit: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  nichtBestellbar: { color: D.color.error, fontWeight: D.font.semibold },
  varianten: { gap: 8, marginTop: 4 },
  variantenLabel: { ...typography.caption, fontWeight: D.font.semibold, color: D.color.inkSecondary },
  variantenHinweis: { ...typography.caption, color: D.color.inkSecondary },
  variantenChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 48, paddingHorizontal: 16, borderRadius: D.radius.full, justifyContent: 'center',
    backgroundColor: D.color.bgSoft, borderWidth: 1, borderColor: D.color.glassBorder,
  },
  chipAktiv: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  chipText: { ...typography.body, color: D.color.inkSecondary },
  chipTextAktiv: { color: D.color.inkInverted, fontWeight: D.font.semibold },
  technikZeile: { paddingVertical: 8, gap: 2 },
  technikLabel: { ...typography.caption, color: D.color.inkSecondary },
  technikWert: { ...typography.body, color: D.color.ink },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  platzhalter: { ...typography.caption, color: D.color.inkSecondary, textAlign: 'center', marginTop: 8 },
  ctaLeiste: { padding: 16, paddingBottom: 8, gap: 8, backgroundColor: D.color.bgSoft, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.color.glassBorder },
  ctaGrund: { ...typography.caption, color: D.color.error, textAlign: 'center' },
  cta: { minHeight: 52, borderRadius: D.radius.lg, backgroundColor: D.color.accent, alignItems: 'center', justifyContent: 'center' },
  ctaInaktiv: { opacity: 0.45 },
  ctaImWarenkorb: { backgroundColor: D.color.accentLight, borderWidth: 1, borderColor: D.color.accent },
  ctaInhalt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { ...typography.body, fontWeight: D.font.bold, color: D.color.inkInverted },
  ctaTextImWarenkorb: { color: D.color.accent },
  ctaHinweis: { ...typography.caption, color: D.color.inkSecondary, textAlign: 'center' },
});
