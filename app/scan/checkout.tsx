import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useStripe } from '@stripe/stripe-react-native';
import { GlassCard } from '../../components/ui/GlassCard';
import { FormField } from '../../components/ui/FormField';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { BackLink } from '../../components/ui/BackLink';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { useOtpVerification } from '../../hooks/useOtpVerification';
import { useAuthStore } from '../../store/authStore';
import { createPaymentIntent } from '../../lib/api/onboarding';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';

// How long (and how often) to poll after Stripe confirms the PaymentSheet
// succeeded, waiting for the backend's own Stripe webhook to actually
// complete the Versorgung server-side — see handleZahlung's comment for why
// this client never completes the order itself.
const BESTAETIGUNG_POLL_VERSUCHE = 10;
const BESTAETIGUNG_POLL_INTERVALL_MS = 1200;

type CheckoutSubstep = 'kontakt' | 'otp' | 'zahlung';

export default function CheckoutScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard(['CHECKOUT', 'CHECKOUT_FEHLGESCHLAGEN'], {
    requireSupply: true,
    requireOcrResult: true,
  });
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const abschliessen = useOnboardingStore((s) => s.abschliessen);
  const bereitsEingeloggt = useAuthStore((s) => !!s.benutzer);
  const otpFlow = useOtpVerification(dispatch);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [substep, setSubstep] = useState<CheckoutSubstep | null>(null);
  const [email, setEmail] = useState('');
  const [zahlungLäuft, setZahlungLäuft] = useState(false);
  const [zahlungsHinweis, setZahlungsHinweis] = useState<string | null>(null);

  React.useEffect(() => {
    if (!session || substep) return;
    // One-time initial substep derived from session/auth data, not a reaction to an external system.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (bereitsEingeloggt) { setSubstep('zahlung'); return; }
    if (session.customerContact.telefonVerifiziert) { setSubstep('zahlung'); return; }
    if (session.customerContact.telefon) {
      otpFlow.setKontakt(session.customerContact.telefon);
      setSubstep('otp');
      return;
    }
    setSubstep('kontakt');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, bereitsEingeloggt]);

  if (!ready || !session || !substep) return <OnboardingLoadingView />;

  const produkt = session.selectedSupply!;
  const eigenanteilText = produkt.eigenanteil === 0 ? 'Kein Eigenanteil' : `${produkt.eigenanteil.toFixed(2).replace('.', ',')} €`;

  const handleKontaktWeiter = async () => {
    const ok = await otpFlow.codeSenden(otpFlow.kontakt, email.trim() || null);
    if (!ok) return;
    setSubstep('otp');
  };

  const handleOtpVerifizieren = async () => {
    const ok = await otpFlow.codeVerifizieren();
    if (!ok) return;
    setSubstep('zahlung');
  };

  // Stripe's PaymentSheet is the entire payment UI (card entry, 3D Secure,
  // Apple/Google Pay if configured) — raw card data never touches this app
  // or SaniMe's own backend. Critically, a successful presentPaymentSheet()
  // here is NOT what completes the Versorgung: that's driven server-side by
  // the backend's Stripe webhook (see StripeWebhookController), which is the
  // only thing that can actually confirm a real charge went through. This
  // client only creates the PaymentIntent, shows the UI, and then waits —
  // it must never dispatch ZAHLUNG_ERFOLGREICH itself, or a client could
  // "complete" a Versorgung it never actually paid for.
  const handleZahlung = async () => {
    setZahlungLäuft(true);
    setZahlungsHinweis(null);
    try {
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
    } catch {
      setZahlungLäuft(false);
      setZahlungsHinweis(null);
      zeigeDispatchFehler();
    }
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
        // Die Versorgung ist zu diesem Zeitpunkt bereits serverseitig angelegt
        // (der Webhook hat complete() bereits aufgerufen) — bei einem Fehler
        // danach (z.B. lokales Benutzer-Anlegen) navigieren wir trotzdem
        // weiter, statt den Nutzer auf einem bereits abgeschlossenen Status
        // stehen zu lassen.
        try {
          await abschliessen();
        } catch {
          // Best effort: siehe Kommentar oben.
        }
        router.replace('/(app)/dashboard');
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

  return (
    <Screen>
        <ScreenHeader
          title="Checkout"
          right={
            <StepCounter
              aktuellerSchritt={STATUS_META.CHECKOUT.schritt}
              gesamtSchritte={11}
              variant="light"
              label={`${STATUS_META.CHECKOUT.schritt}/11`}
            />
          }
        />

        <ScrollContainer contentContainerStyle={styles.scrollContent}>
          {substep === 'kontakt' && (
            <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 20 }}>
              <Text style={styles.headline}>Wie erreichen{'\n'}wir dich?</Text>
              <Text style={styles.sub}>Wir brauchen deine Kontaktdaten, um dich über deine Versorgung zu informieren.</Text>
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
              <TouchableOpacity style={styles.button} onPress={handleKontaktWeiter} disabled={otpFlow.loading} activeOpacity={0.85}>
                <LinearGradient colors={[D.color.gradientTop, D.color.gradientBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                {otpFlow.loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonLabel}>Code senden</Text>}
              </TouchableOpacity>
            </Animated.View>
          )}

          {substep === 'otp' && (
            <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 20 }}>
              <BackLink onPress={() => setSubstep('kontakt')} accessibilityLabel="Zurück zur Eingabe" />
              <Text style={styles.headline}>Code{'\n'}bestätigen.</Text>
              <Text style={styles.sub}>
                Wir haben einen Code an {otpFlow.kontakt} gesendet.
              </Text>
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
              <TouchableOpacity style={styles.button} onPress={handleOtpVerifizieren} disabled={otpFlow.loading} activeOpacity={0.85}>
                <LinearGradient colors={[D.color.gradientTop, D.color.gradientBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                {otpFlow.loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonLabel}>Bestätigen</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => otpFlow.codeSenden(otpFlow.kontakt, email.trim() || null)}
                style={styles.nochmalLink}
                accessibilityRole="button"
                accessibilityLabel="Code erneut senden"
              >
                <Text style={styles.nochmalText}>Code erneut senden</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {substep === 'zahlung' && (
            <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 20 }}>
              {session.status === 'CHECKOUT_FEHLGESCHLAGEN' && (
                <View style={styles.fehlerBanner}>
                  <Text style={styles.fehlerTitel}>Die Zahlung ist fehlgeschlagen</Text>
                  <Text style={styles.fehlerText}>
                    Keine Sorge — deine Angaben sind gespeichert. Du kannst es jederzeit erneut versuchen.
                  </Text>
                  <TouchableOpacity onPress={handleErneutVersuchen} accessibilityRole="button">
                    <Text style={styles.fehlerRetry}>Erneut versuchen</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.headline}>Fast{'\n'}geschafft.</Text>
              <Text style={styles.sub}>Letzter Schritt: die Zahlung deiner Zuzahlung.</Text>
              <View style={styles.zuzahlungBox}>
                <Text style={styles.zuzahlungLabel}>Zu zahlen</Text>
                <Text style={styles.zuzahlungWert}>{eigenanteilText}</Text>
              </View>
              {session.status !== 'CHECKOUT_FEHLGESCHLAGEN' && (
                <>
                  <TouchableOpacity style={styles.button} onPress={handleZahlung} disabled={zahlungLäuft} activeOpacity={0.85}>
                    <LinearGradient colors={[D.color.gradientTop, D.color.gradientBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    {zahlungLäuft ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonLabel}>Jetzt bezahlen — {eigenanteilText}</Text>}
                  </TouchableOpacity>
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

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
  headline: {
    fontSize: D.font.xxl + 4, fontWeight: D.font.heavy, color: D.color.ink,
    letterSpacing: -0.8, lineHeight: (D.font.xxl + 4) * 1.1,
  },
  sub: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 22 },
  button: {
    height: 56, borderRadius: D.radius.lg,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  buttonLabel: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.inkInverted },
  zahlungsHinweis: { fontSize: D.font.sm, color: D.color.inkSecondary, textAlign: 'center' },
  nochmalLink: { alignItems: 'center', paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  nochmalText: { fontSize: D.font.md, color: D.color.accent, fontWeight: D.font.semibold },
  zuzahlungBox: {
    backgroundColor: D.color.accentLight, borderRadius: D.radius.md,
    padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(63,139,255,0.15)',
  },
  zuzahlungLabel: { fontSize: D.font.sm, color: D.color.inkSecondary, fontWeight: D.font.medium },
  zuzahlungWert: { fontSize: D.font.xl, fontWeight: D.font.heavy, color: D.color.accent },
  fehlerBanner: {
    backgroundColor: D.color.errorLight, borderRadius: D.radius.md, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)', gap: 6,
  },
  fehlerTitel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.error },
  fehlerText: { fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19 },
  fehlerRetry: { fontSize: D.font.sm, color: D.color.error, fontWeight: D.font.bold, marginTop: 4 },
});
