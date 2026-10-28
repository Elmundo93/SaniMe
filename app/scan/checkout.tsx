import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import {
  betragBeimCheckoutEuro,
  istAbschlussfaehig,
  istKassenartikel,
  positionenOhneRezept,
  rezeptVollstaendig,
  terminNachGenehmigung,
  NOTFALL_GRUENDE,
  voraussichtlicheZuzahlungEuro,
  zahlungBeimCheckoutFaellig,
  type ClientOnboardingEvent,
  type WarenkorbArtikel,
  type WarenkorbPosition,
} from '@sanime/domain';
import { GlassCard } from '../../components/ui/GlassCard';
import { FormField } from '../../components/ui/FormField';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { BackLink } from '../../components/ui/BackLink';
import { Checkbox } from '../../components/ui/Checkbox';
import { Section } from '../../components/ui/Section';
import { WarenkorbZeile, type RezeptStatus } from '../../components/produkt/WarenkorbZeile';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useWarenkorbStore } from '../../store/warenkorbStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { useOtpVerification } from '../../hooks/useOtpVerification';
import { useAuthStore } from '../../store/authStore';
import { createPaymentIntent, devZahlungSimulieren } from '../../lib/api/onboarding';
import { resolveStripePublishableKey } from '../../lib/api/config';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { pushNachBestellungAnbieten } from '../../lib/push';
import { bestelltFuerSichSelbst } from '../../lib/besteller';
import { formatEuro, anzahlText } from '../../lib/katalogAnzeige';
import { gleicheProdukte, warenkorbAbgleich } from '../../lib/warenkorb';
import { D } from '@sanime/design-system';

// How long (and how often) to poll after Stripe confirms the PaymentSheet
// succeeded, waiting for the backend's own Stripe webhook to actually
// complete the order server-side — see handleZahlung's comment for why
// this client never completes the order itself.
const BESTAETIGUNG_POLL_VERSUCHE = 10;
const BESTAETIGUNG_POLL_INTERVALL_MS = 1200;

// Die Kasse ist die Nabe der Bestellung: 'uebersicht' zeigt den ganzen
// Warenkorb mit Rezept-Status je Kassenartikel, Termin und Kosten — Rezept
// fotografieren/prüfen und Termin wählen sind Speichen, die hierher
// zurückführen. 'abschluss' ist je nach Bestellung die Zahlung (Selbstzahler-
// Anteil) oder das verbindliche Absenden ohne Zahlung (nur Kassenartikel — die
// gesetzliche Zuzahlung wird erst nach Genehmigung abgerechnet, siehe
// zahlungBeimCheckoutFaellig in @sanime/domain).
type CheckoutSubstep = 'uebersicht' | 'kontakt' | 'otp' | 'abschluss';

function zuArtikel(positionen: WarenkorbPosition[]): WarenkorbArtikel[] {
  return positionen.map((p) => ({ produktId: p.produkt.id, ...(p.krankheitsbildId ? { krankheitsbildId: p.krankheitsbildId } : {}) }));
}

function rezeptStatus(position: WarenkorbPosition): RezeptStatus {
  if (!istKassenartikel(position.produkt)) return 'nicht-noetig';
  if (position.ohneRezept) return 'ohne-rezept';
  return rezeptVollstaendig(position.rezept) ? 'erfasst' : 'fehlt';
}

function terminText(beginn: string): string {
  const datum = new Date(beginn);
  return `${datum.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}, ${datum.getHours()}:00 Uhr`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard(['CHECKOUT', 'CHECKOUT_FEHLGESCHLAGEN']);
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const einreichen = useOnboardingStore((s) => s.einreichen);
  const abschliessen = useOnboardingStore((s) => s.abschliessen);
  // Nur wer für sich selbst bestellt, überspringt die Telefonbestätigung —
  // dieselbe Regel prüft der Server (CustomersService.istBekannterBesteller).
  const benutzer = useAuthStore((s) => s.benutzer);
  // Vorab im Profil eingetragene Kontaktdaten vorbelegen (bleiben editierbar).
  const vorabProfil = useAuthStore((s) => s.vorabProfil);
  const otpFlow = useOtpVerification(dispatch, vorabProfil?.telefon ?? '');
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [substep, setSubstep] = useState<CheckoutSubstep>(
    session?.status === 'CHECKOUT_FEHLGESCHLAGEN' ? 'abschluss' : 'uebersicht',
  );
  const [email, setEmail] = useState(vorabProfil?.email ?? '');
  const [bestaetigt, setBestaetigt] = useState(false);
  const [zahlungLäuft, setZahlungLäuft] = useState(false);
  const [aktionLaeuft, setAktionLaeuft] = useState(false);
  const [zahlungsHinweis, setZahlungsHinweis] = useState<string | null>(null);
  const abgeglichen = useRef(false);

  // Einmal beim Öffnen: lokaler Warenkorb und Positionen der Bestellung
  // angleichen (z. B. ein Rezept zuerst gewähltes Produkt, oder Artikel, die
  // seit dem letzten Besuch der Kasse hinzugekommen sind).
  useEffect(() => {
    if (!ready || !session || abgeglichen.current) return;
    abgeglichen.current = true;
    (async () => {
      const warenkorb = useWarenkorbStore.getState();
      await warenkorb.laden();
      const lokal = useWarenkorbStore.getState().artikel;
      const ziel = warenkorbAbgleich(lokal, session.positionen);
      if (!gleicheProdukte(ziel, lokal)) await warenkorb.ersetzen(ziel);
      if (!gleicheProdukte(ziel, zuArtikel(session.positionen))) {
        const result = await dispatch({ type: 'WARENKORB_UEBERNOMMEN', artikel: ziel, produkte: [] });
        if (!result.ok) zeigeDispatchFehler();
      }
    })();
  }, [ready, session, dispatch]);

  if (!ready || !session) return <OnboardingLoadingView />;

  const bereitsEingeloggt = bestelltFuerSichSelbst(!!benutzer, benutzer?.versichertenNr, session.krankenkasse?.versichertenNr);
  const zahlungFaellig = zahlungBeimCheckoutFaellig(session);
  const betragJetzt = betragBeimCheckoutEuro(session);
  const zuzahlungSpaeter = voraussichtlicheZuzahlungEuro(session);
  const ohneRezept = positionenOhneRezept(session);
  const abschlussfaehig = istAbschlussfaehig(session);
  const terminSpaeter = terminNachGenehmigung(session);
  const kassenartikel = session.positionen.filter((p) => istKassenartikel(p.produkt) && !p.ohneRezept);
  const ersteRezept = session.positionen.find((p) => p.rezept)?.rezept ?? null;
  const adresse = session.positionen.find((p) => p.rezept?.patient.adresse)?.rezept?.patient.adresse;
  const lieferadresse = adresse ? [adresse.strasse, [adresse.plz, adresse.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '';

  // Speichen der Kasse (Rezept, Termin): dispatchen und auf den Schritt schieben.
  const speiche = async (event: ClientOnboardingEvent) => {
    setAktionLaeuft(true);
    const result = await dispatch(event);
    setAktionLaeuft(false);
    if (result.ok) router.push(STATUS_META[result.session.status].route as any);
    else zeigeDispatchFehler();
  };

  const notfallZuruecknehmen = async () => {
    setAktionLaeuft(true);
    const result = await dispatch({ type: 'NOTFALL_ANGEFRAGT', notfall: null });
    setAktionLaeuft(false);
    if (!result.ok) zeigeDispatchFehler();
  };

  const entfernen = (position: WarenkorbPosition) => {
    const ausfuehren = async () => {
      const rest = zuArtikel(session.positionen.filter((p) => p.produkt.id !== position.produkt.id));
      setAktionLaeuft(true);
      const result = await dispatch({ type: 'WARENKORB_UEBERNOMMEN', artikel: rest, produkte: [] });
      setAktionLaeuft(false);
      if (!result.ok) {
        zeigeDispatchFehler();
        return;
      }
      await useWarenkorbStore.getState().entfernen(position.produkt.id);
    };
    if (position.rezept) {
      Alert.alert(
        'Artikel entfernen?',
        `Das erfasste Rezept für ${position.produkt.name} wird dann nicht mit eingereicht.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Entfernen', style: 'destructive', onPress: ausfuehren },
        ],
      );
    } else {
      ausfuehren();
    }
  };

  // Kassenartikel ohne Rezept zum Selbstzahlerpreis kaufen — bewusst mit
  // Rückfrage: wer sein Rezept nur noch nicht fotografiert hat, soll nicht
  // versehentlich den vollen Preis zahlen.
  const ohneRezeptSetzen = (position: WarenkorbPosition, ohneRezept: boolean) => {
    const ausfuehren = async () => {
      setAktionLaeuft(true);
      const result = await dispatch({ type: 'POSITION_OHNE_REZEPT', produktId: position.produkt.id, ohneRezept });
      setAktionLaeuft(false);
      if (!result.ok) zeigeDispatchFehler();
    };
    if (!ohneRezept) {
      ausfuehren();
      return;
    }
    const preis = formatEuro(position.produkt.selbstzahlerPreis ?? 0);
    Alert.alert(
      'Ohne Rezept kaufen?',
      `Du zahlst für ${position.produkt.name} unseren Preis von ${preis} selbst, die Krankenkasse ist nicht beteiligt. Mit Rezept zahlst du höchstens die gesetzliche Zuzahlung.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: `Für ${preis} kaufen`, onPress: ausfuehren },
      ],
    );
  };

  const zurueckZumWarenkorb = () => {
    router.dismissAll();
    router.navigate('/warenkorb' as any);
  };

  const weiterZurKontaktangabe = () => {
    if (bereitsEingeloggt || session.customerContact.telefonVerifiziert) {
      setSubstep('abschluss');
    } else if (session.customerContact.telefon) {
      otpFlow.setKontakt(session.customerContact.telefon);
      setSubstep('otp');
    } else {
      setSubstep('kontakt');
    }
  };

  // Die Bestellung ist nach einem erfolgreichen einreichen() serverseitig
  // bereits angelegt — scheitert danach nur das lokale Aufräumen, navigieren
  // wir trotzdem weiter (gleiche Begründung wie in wartenAufAbschluss).
  const zumDashboard = async () => {
    try {
      await abschliessen();
    } catch {
      // Best effort: siehe Kommentar oben.
    }
    router.replace('/dashboard');
    // Erst auf dem Dashboard fragen — die Bestellung ist dann sichtbar durch.
    pushNachBestellungAnbieten();
  };

  const handleEinreichen = async () => {
    setZahlungLäuft(true);
    const result = await einreichen();
    if (!result.ok) {
      setZahlungLäuft(false);
      if (!telefonBestaetigenStatt(result.reason)) zeigeDispatchFehler();
      return;
    }
    await zumDashboard();
  };

  const handleKontaktWeiter = async () => {
    const ergebnis = await otpFlow.codeSenden(otpFlow.kontakt, email.trim() || null);
    if (ergebnis === 'fehler') return;
    setSubstep(ergebnis === 'verifiziert' ? 'abschluss' : 'otp');
  };

  const handleCodeErneutSenden = async () => {
    const ergebnis = await otpFlow.codeSenden(otpFlow.kontakt, email.trim() || null);
    if (ergebnis === 'verifiziert') setSubstep('abschluss');
  };

  const handleOtpVerifizieren = async () => {
    const ok = await otpFlow.codeVerifizieren();
    if (!ok) return;
    setSubstep('abschluss');
  };

  // Stripe's PaymentSheet is the entire payment UI (card entry, 3D Secure,
  // Apple/Google Pay if configured) — raw card data never touches this app
  // or SaniMe's own backend. Critically, a successful presentPaymentSheet()
  // here is NOT what completes the order: that's driven server-side by
  // the backend's Stripe webhook (see StripeWebhookController), which is the
  // only thing that can actually confirm a real charge went through. This
  // client only creates the PaymentIntent, shows the UI, and then waits —
  // it must never dispatch ZAHLUNG_ERFOLGREICH itself, or a client could
  // "complete" an order it never actually paid for.
  const handleZahlung = async () => {
    setZahlungLäuft(true);
    setZahlungsHinweis(null);
    try {
      // Lokale Entwicklung ohne Stripe-Keys: Zahlung serverseitig simulieren
      // statt an einer nicht konfigurierten PaymentSheet zu scheitern.
      if (__DEV__ && !resolveStripePublishableKey()) {
        await devZahlungSimulieren(session.id);
        setZahlungsHinweis('Zahlung wird bestätigt…');
        await wartenAufAbschluss();
        return;
      }
      const { clientSecret } = await createPaymentIntent(session.id);
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'SaniMe',
        paymentIntentClientSecret: clientSecret,
      });
      if (initError) {
        setZahlungLäuft(false);
        Alert.alert('Das hat nicht funktioniert', 'Die Zahlung konnte nicht vorbereitet werden. Bitte versuche es erneut.');
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        setZahlungLäuft(false);
        // 'Canceled' means the customer closed the sheet themselves — not a
        // failure worth alerting about, they can just tap "Jetzt bezahlen" again.
        if (presentError.code !== 'Canceled') {
          Alert.alert('Zahlung nicht abgeschlossen', 'Bitte überprüfe deine Zahlungsdaten und versuche es erneut.');
        }
        return;
      }

      setZahlungsHinweis('Zahlung wird bestätigt…');
      await wartenAufAbschluss();
    } catch (e) {
      setZahlungLäuft(false);
      setZahlungsHinweis(null);
      if (!telefonBestaetigenStatt(e instanceof Error ? e.message : undefined)) zeigeDispatchFehler();
    }
  };

  // Verlangt der Server eine bestätigte Nummer (neue Person), direkt dorthin
  // statt einer allgemeinen Fehlermeldung.
  const telefonBestaetigenStatt = (grund: string | undefined): boolean => {
    if (!grund?.includes('Telefonnummer')) return false;
    setSubstep('kontakt');
    return true;
  };

  // Polls the backend's own session state — never assumes success from
  // presentPaymentSheet() alone — until the webhook has actually flipped
  // status to ABGESCHLOSSEN (or CHECKOUT_FEHLGESCHLAGEN, if Stripe's async
  // confirmation itself later fails, e.g. a delayed payment method).
  const wartenAufAbschluss = async () => {
    for (let versuch = 0; versuch < BESTAETIGUNG_POLL_VERSUCHE; versuch++) {
      await new Promise((r) => setTimeout(r, BESTAETIGUNG_POLL_INTERVALL_MS));
      await useOnboardingStore.getState().laden();
      const aktuellerStatus = useOnboardingStore.getState().session?.status;
      if (aktuellerStatus === 'ABGESCHLOSSEN') {
        // Die Bestellung ist zu diesem Zeitpunkt bereits serverseitig angelegt
        // (der Webhook hat sie abgeschlossen) — bei einem Fehler danach (z.B.
        // lokales Benutzer-Anlegen) navigieren wir trotzdem weiter, statt den
        // Nutzer auf einem bereits abgeschlossenen Status stehen zu lassen.
        await zumDashboard();
        return;
      }
      if (aktuellerStatus === 'CHECKOUT_FEHLGESCHLAGEN') {
        setZahlungLäuft(false);
        setZahlungsHinweis(null);
        return;
      }
    }
    setZahlungLäuft(false);
    setZahlungsHinweis(null);
    Alert.alert(
      'Wird noch bestätigt',
      'Deine Zahlung wird noch verarbeitet. Bitte prüfe es in ein paar Minuten erneut.',
    );
  };

  const handleErneutVersuchen = async () => {
    const result = await dispatch({ type: 'CHECKOUT_ERNEUT_VERSUCHEN' });
    if (!result.ok) zeigeDispatchFehler();
  };

  const kostenBox = (
    <View style={styles.kostenBox}>
      <View style={styles.kostenZeile}>
        <Text style={styles.kostenLabel}>Jetzt zu zahlen</Text>
        <Text style={styles.kostenWert}>{formatEuro(betragJetzt)}</Text>
      </View>
      {kassenartikel.length > 0 && (
        <>
          <View style={styles.kostenZeile}>
            <Text style={styles.kostenLabel}>Gesetzliche Zuzahlung, voraussichtlich</Text>
            <Text style={styles.kostenNebenwert}>bis {formatEuro(zuzahlungSpaeter)}</Text>
          </View>
          <Text style={styles.kostenHinweis}>
            Die Zuzahlung (10 % des Preises, mindestens 5 €, höchstens 10 € je Artikel) wird erst nach der Genehmigung durch
            deine Krankenkasse abgerechnet. Bist du befreit oder unter 18, entfällt sie.
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title="Kasse"
        onBack={substep === 'uebersicht' ? zurueckZumWarenkorb : () => setSubstep('uebersicht')}
      />

      <ScrollContainer contentContainerStyle={styles.scrollContent}>
        {substep === 'uebersicht' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.gap}>
            <Text style={styles.headline} accessibilityRole="header">Deine Bestellung</Text>
            <Text style={styles.sub}>
              {anzahlText(session.positionen.length, 'Artikel', 'Artikel')}
              {kassenartikel.length > 0 ? ` · ${anzahlText(kassenartikel.length, 'Kassenartikel', 'Kassenartikel')} mit je eigenem Rezept` : ''}
            </Text>

            {ohneRezept.length > 0 && (
              <View style={styles.hinweisBox} accessibilityRole="alert">
                <Feather name="camera" size={18} color={D.color.warning} />
                <Text style={styles.hinweisBoxText}>
                  Für {anzahlText(ohneRezept.length, 'Kassenartikel fehlt', 'Kassenartikel fehlen')} noch das Rezept. Fotografiere es
                  direkt hier — wir lesen es auf deinem Gerät aus. Hast du keins, kannst du den Artikel auch ohne Rezept zu unserem
                  Preis kaufen.
                </Text>
              </View>
            )}

            {session.positionen.map((position) => {
              const status = rezeptStatus(position);
              return (
                <WarenkorbZeile
                  key={position.produkt.id}
                  produkt={position.produkt}
                  rezeptStatus={status}
                  detail={position.rezept ? `Rezept: ${position.rezept.hilfsmittel} · ${position.rezept.arzt.name}` : undefined}
                  onEntfernen={session.positionen.length > 1 && !aktionLaeuft ? () => entfernen(position) : undefined}
                  aktion={
                    status === 'fehlt'
                      ? {
                          label: position.rezept ? 'Rezept vervollständigen' : 'Rezept fotografieren',
                          icon: 'camera',
                          hervorgehoben: true,
                          onPress: () =>
                            speiche(
                              position.rezept
                                ? { type: 'REZEPT_BEARBEITEN', produktId: position.produkt.id }
                                : { type: 'REZEPT_FUER_POSITION', produktId: position.produkt.id },
                            ),
                        }
                      : status === 'erfasst'
                        ? { label: 'Rezept prüfen', icon: 'edit-2', onPress: () => speiche({ type: 'REZEPT_BEARBEITEN', produktId: position.produkt.id }) }
                        : status === 'ohne-rezept'
                          ? {
                              label: 'Doch mit Rezept bestellen',
                              icon: 'file-text',
                              onPress: () => ohneRezeptSetzen(position, false),
                            }
                          : undefined
                  }
                  nebenAktion={
                    status === 'fehlt' && position.produkt.selbstzahlerPreis !== undefined && !aktionLaeuft
                      ? {
                          label: `Kein Rezept? Für ${formatEuro(position.produkt.selbstzahlerPreis)} kaufen`,
                          a11yLabel: `${position.produkt.name} ohne Rezept für ${formatEuro(position.produkt.selbstzahlerPreis)} kaufen`,
                          icon: 'credit-card',
                          onPress: () => ohneRezeptSetzen(position, true),
                        }
                      : undefined
                  }
                />
              );
            })}

            <View style={styles.linkReihe}>
              <TouchableOpacity
                style={styles.link}
                onPress={() => speiche({ type: 'REZEPT_HINZUFUEGEN' })}
                accessibilityRole="button"
                accessibilityLabel="Weiteres Rezept scannen"
              >
                <Feather name="file-plus" size={16} color={D.color.accent} />
                <Text style={styles.linkText}>Weiteres Rezept scannen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.link}
                onPress={() => {
                  router.dismissAll();
                  router.navigate('/entdecken');
                }}
                accessibilityRole="button"
                accessibilityLabel="Weitere Artikel aus dem Katalog hinzufügen"
              >
                <Feather name="plus" size={16} color={D.color.accent} />
                <Text style={styles.linkText}>Artikel hinzufügen</Text>
              </TouchableOpacity>
            </View>

            {(session.krankenkasse || ersteRezept) && (
              <Section titel="Person & Krankenkasse" padding={16}>
                {!!ersteRezept?.patient.name && <SectionRow label="Name" wert={ersteRezept.patient.name} />}
                {session.krankenkasse && <SectionRow label="Krankenkasse" wert={session.krankenkasse.name} />}
                {session.krankenkasse && <SectionRow label="Versichertennummer" wert={session.krankenkasse.versichertenNr} />}
                {!!lieferadresse && <SectionRow label="Lieferadresse" wert={lieferadresse} />}
              </Section>
            )}

            {terminSpaeter ? (
              // Kassenartikel: die Kasse entscheidet erst (bis zu drei Wochen) —
              // der Termin folgt nach der Genehmigung, dringende Fälle per Rückruf.
              <Section titel="Liefertermin" padding={16}>
                <Text style={styles.terminHinweis}>
                  Wir schicken deinen Antrag an die Krankenkasse. Sobald sie zugestimmt hat — meist innerhalb von drei Wochen — benachrichtigen
                  wir dich und du wählst deinen Liefertermin.
                </Text>
                {session.notfall ? (
                  <View style={styles.notfallZeile}>
                    <Feather name="phone-call" size={16} color={D.color.accent} />
                    <Text style={styles.notfallText}>
                      Notfalllieferung angefragt ({NOTFALL_GRUENDE[session.notfall.grund]}) — wir rufen dich nach der Bestellung an.
                    </Text>
                    <TouchableOpacity
                      onPress={() => notfallZuruecknehmen()}
                      style={styles.notfallAktion}
                      accessibilityRole="button"
                      accessibilityLabel="Notfallanfrage zurücknehmen"
                    >
                      <Text style={styles.linkText}>Zurücknehmen</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.terminButton}
                    onPress={() => router.push('/scan/notfall')}
                    accessibilityRole="button"
                    accessibilityLabel="Früher benötigt? Notfalllieferung anfragen"
                  >
                    <Feather name="alert-circle" size={18} color={D.color.accent} />
                    <Text style={styles.linkText}>Früher benötigt? Notfalllieferung anfragen</Text>
                  </TouchableOpacity>
                )}
              </Section>
            ) : (
              <Section
                titel="Termin"
                aktionLabel={session.selectedAppointment ? 'Ändern' : undefined}
                onAktion={session.selectedAppointment ? () => speiche({ type: 'TERMIN_WAEHLEN' }) : undefined}
                padding={16}
              >
                {session.selectedAppointment ? (
                  <>
                    <SectionRow label="Wann" wert={terminText(session.selectedAppointment.beginn)} />
                    <SectionRow label="Wo" wert={session.selectedAppointment.ort} />
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.terminButton}
                    onPress={() => speiche({ type: 'TERMIN_WAEHLEN' })}
                    accessibilityRole="button"
                    accessibilityLabel="Termin für die Lieferung wählen"
                  >
                    <Feather name="calendar" size={18} color={D.color.accent} />
                    <Text style={styles.linkText}>Termin für die Lieferung wählen</Text>
                  </TouchableOpacity>
                )}
              </Section>
            )}

            {kostenBox}

            {!abschlussfaehig && (
              <Text style={styles.offen}>
                {[
                  ohneRezept.length > 0 ? 'Rezepte erfassen' : null,
                  !terminSpaeter && !session.selectedAppointment ? 'Termin wählen' : null,
                ]
                  .filter(Boolean)
                  .join(' und ')}{' '}
                — dann kannst du die Bestellung abschließen.
              </Text>
            )}

            <PrimaerKnopf
              label="Weiter"
              onPress={weiterZurKontaktangabe}
              disabled={!abschlussfaehig || aktionLaeuft}
              laedt={aktionLaeuft}
            />
          </Animated.View>
        )}

        {substep === 'kontakt' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.gap}>
            <Text style={styles.headline}>Wie erreichen{'\n'}wir dich?</Text>
            <Text style={styles.sub}>Wir brauchen deine Kontaktdaten, um dich über deine Bestellung zu informieren.</Text>
            <GlassCard padding={16} radius={D.radius.md} style={{ gap: 16 } as object}>
              <FormField
                label="E-Mail (optional)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="max@beispiel.de"
              />
              <FormField
                label="Telefonnummer"
                value={otpFlow.kontakt}
                onChangeText={otpFlow.setKontakt}
                keyboardType="phone-pad"
                placeholder="+49 151 00000000"
                error={otpFlow.fehler}
              />
            </GlassCard>
            <PrimaerKnopf label="Code senden" onPress={handleKontaktWeiter} disabled={otpFlow.loading} laedt={otpFlow.loading} />
          </Animated.View>
        )}

        {substep === 'otp' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.gap}>
            <BackLink onPress={() => setSubstep('kontakt')} accessibilityLabel="Zurück zur Eingabe" />
            <Text style={styles.headline}>Code{'\n'}bestätigen.</Text>
            <Text style={styles.sub}>Wir haben einen Code an {otpFlow.kontakt} gesendet.</Text>
            <GlassCard padding={16} radius={D.radius.md}>
              <FormField
                label="6-stelliger Code"
                value={otpFlow.code}
                onChangeText={(t) => otpFlow.setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                error={otpFlow.fehler}
                autoFocus
              />
            </GlassCard>
            <PrimaerKnopf label="Bestätigen" onPress={handleOtpVerifizieren} disabled={otpFlow.loading} laedt={otpFlow.loading} />
            <TouchableOpacity
              onPress={handleCodeErneutSenden}
              style={styles.nochmalLink}
              accessibilityRole="button"
              accessibilityLabel="Code erneut senden"
            >
              <Text style={styles.nochmalText}>Code erneut senden</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {substep === 'abschluss' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.gap}>
            {session.status === 'CHECKOUT_FEHLGESCHLAGEN' && (
              <View style={styles.fehlerBanner}>
                <Text style={styles.fehlerTitel}>Die Zahlung ist fehlgeschlagen</Text>
                <Text style={styles.fehlerText}>
                  Keine Sorge — deine Angaben sind gespeichert. Du kannst es jederzeit erneut versuchen.
                </Text>
                <TouchableOpacity onPress={handleErneutVersuchen} accessibilityRole="button" style={styles.nochmalLink}>
                  <Text style={styles.fehlerRetry}>Erneut versuchen</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.headline}>Fast{'\n'}geschafft.</Text>
            <Text style={styles.sub}>
              {zahlungFaellig
                ? `Letzter Schritt: die Bezahlung deiner Bestellung (${anzahlText(session.positionen.length, 'Artikel', 'Artikel')}).`
                : `Letzter Schritt: Sende deine Bestellung (${anzahlText(session.positionen.length, 'Artikel', 'Artikel')}) verbindlich ab. Jetzt ist nichts zu bezahlen.`}
            </Text>
            {kostenBox}
            <View style={styles.confirmBox}>
              <Checkbox
                checked={bestaetigt}
                onToggle={setBestaetigt}
                label={zahlungFaellig ? 'Ich bestelle verbindlich und zahlungspflichtig.' : 'Ich bestätige die verbindliche Beauftragung.'}
              />
            </View>
            {session.status !== 'CHECKOUT_FEHLGESCHLAGEN' && (
              <>
                <PrimaerKnopf
                  label={zahlungFaellig ? `Zahlungspflichtig bestellen — ${formatEuro(betragJetzt)}` : 'Verbindlich absenden'}
                  onPress={zahlungFaellig ? handleZahlung : handleEinreichen}
                  disabled={!bestaetigt || zahlungLäuft}
                  laedt={zahlungLäuft}
                />
                {zahlungsHinweis && <Text style={styles.zahlungsHinweis}>{zahlungsHinweis}</Text>}
              </>
            )}
          </Animated.View>
        )}

        <View style={{ height: 60 }} />
      </ScrollContainer>
    </Screen>
  );
}

function SectionRow({ label, wert }: { label: string; wert: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowWert}>{wert}</Text>
    </View>
  );
}

function PrimaerKnopf({ label, onPress, disabled, laedt }: { label: string; onPress: () => void; disabled?: boolean; laedt?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && !laedt && styles.buttonInaktiv]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!laedt }}
    >
      <LinearGradient colors={[D.color.gradientTop, D.color.gradientBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      {laedt ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonLabel}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
  gap: { gap: 16 },
  headline: {
    fontSize: D.font.xxl + 4, fontWeight: D.font.heavy, color: D.color.ink,
    letterSpacing: -0.8, lineHeight: (D.font.xxl + 4) * 1.1,
  },
  sub: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 22 },
  button: {
    minHeight: 56, borderRadius: D.radius.lg, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  buttonInaktiv: { opacity: 0.45 },
  buttonLabel: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.inkInverted, textAlign: 'center' },
  zahlungsHinweis: { fontSize: D.font.sm, color: D.color.inkSecondary, textAlign: 'center' },
  nochmalLink: { alignItems: 'center', paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  nochmalText: { fontSize: D.font.md, color: D.color.accent, fontWeight: D.font.semibold },
  hinweisBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: D.color.warningLight, borderRadius: D.radius.md, padding: 14,
  },
  hinweisBoxText: { flex: 1, fontSize: D.font.sm, color: D.color.ink, lineHeight: 19 },
  linkReihe: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 4 },
  linkText: { fontSize: D.font.sm, fontWeight: D.font.semibold, color: D.color.accent },
  terminButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  terminHinweis: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 20, marginBottom: 8 },
  notfallZeile: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  notfallText: { flex: 1, minWidth: 180, fontSize: D.font.sm, color: D.color.ink, lineHeight: 20 },
  notfallAktion: { minHeight: 44, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel: { fontSize: D.font.sm, color: D.color.inkSecondary, flexShrink: 0 },
  rowWert: { fontSize: D.font.sm, color: D.color.ink, fontWeight: D.font.medium, flex: 1, textAlign: 'right' },
  kostenBox: {
    backgroundColor: D.color.accentLight, borderRadius: D.radius.md, padding: 16, gap: 8,
    borderWidth: 1, borderColor: 'rgba(63,139,255,0.15)',
  },
  kostenZeile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  kostenLabel: { fontSize: D.font.sm, color: D.color.inkSecondary, fontWeight: D.font.medium, flex: 1 },
  kostenWert: { fontSize: D.font.xl, fontWeight: D.font.heavy, color: D.color.accent },
  kostenNebenwert: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.ink },
  kostenHinweis: { fontSize: D.font.xs, color: D.color.inkTertiary, lineHeight: 16 },
  offen: { fontSize: D.font.sm, color: D.color.inkSecondary, textAlign: 'center', lineHeight: 19 },
  confirmBox: {
    backgroundColor: D.color.bgSoft, borderRadius: D.radius.md, padding: 16,
    borderWidth: 1, borderColor: D.color.glassBorder,
  },
  fehlerBanner: {
    backgroundColor: D.color.errorLight, borderRadius: D.radius.md, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)', gap: 6,
  },
  fehlerTitel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.error },
  fehlerText: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19 },
  fehlerRetry: { fontSize: D.font.sm, color: D.color.error, fontWeight: D.font.bold },
});
