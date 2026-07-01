import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useOtpVerification } from '../../hooks/useOtpVerification';
import { D } from '../../constants/design';
import type { Benutzer } from '../../types';

export default function OtpScreen() {
  const router = useRouter();
  const setBenutzer = useAuthStore((s) => s.setBenutzer);
  const otpFlow = useOtpVerification();
  const { phase, kontakt, setKontakt, code, setCode, loading, fehler, codeRef } = otpFlow;

  const handleKontaktSenden = () => otpFlow.codeSenden(kontakt);

  const handleOtpVerifizieren = async () => {
    const ok = await otpFlow.codeVerifizieren();
    if (!ok) return;

    const mockBenutzer: Benutzer = {
      id: 'u-001',
      vorname: 'Max',
      nachname: 'Mustermann',
      telefon: kontakt,
      krankenkasse: 'Techniker Krankenkasse',
      versichertenNr: 'A123456789',
    };

    await setBenutzer(mockBenutzer, 'mock-jwt-token-xxx');
    router.replace('/(app)/dashboard');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[D.color.dark, '#0A1630']}
        style={StyleSheet.absoluteFill}
      />

      {/* Blauer Glow oben */}
      <View style={styles.glow} pointerEvents="none">
        <LinearGradient
          colors={['rgba(91,174,255,0.2)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          {/* Logo */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.logoArea}>
            <View style={styles.logoMark}>
              <LinearGradient
                colors={[D.color.gradientTop, D.color.gradientBottom]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.logoMarkText}>✦</Text>
            </View>
            <Text style={styles.logoName}>SaniMe</Text>
          </Animated.View>

          {/* Inhalt */}
          <View style={styles.content}>
            {phase === 'eingabe' ? (
              <>
                <Animated.View entering={FadeInDown.delay(100).springify().damping(18)}>
                  <Text style={styles.headline}>Willkommen{'\n'}zurück.</Text>
                  <Text style={styles.sub}>
                    Kein Passwort. Wir senden einen Einmalcode
                    an Ihre Telefonnummer oder E-Mail.
                  </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(220).springify().damping(18)} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Telefon oder E-Mail</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+49 151 00000000"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={kontakt}
                    onChangeText={setKontakt}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="tel"
                    returnKeyType="send"
                    onSubmitEditing={handleKontaktSenden}
                    accessible
                    accessibilityLabel="Telefonnummer oder E-Mail-Adresse"
                  />
                </Animated.View>

                {fehler ? (
                  <Text style={styles.fehler} role="alert">{fehler}</Text>
                ) : null}

                <Animated.View entering={FadeInDown.delay(320).springify().damping(18)}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleKontaktSenden}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[D.color.gradientTop, D.color.gradientBottom]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.buttonLabel}>Code senden</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <>
                <Animated.View entering={FadeInDown.delay(80).springify()}>
                  <TouchableOpacity
                    onPress={otpFlow.reset}
                    hitSlop={12}
                    accessibilityLabel="Zurück zur Eingabe"
                  >
                    <Text style={styles.zurück}>← Zurück</Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(150).springify().damping(18)}>
                  <Text style={styles.headline}>Code{'\n'}eingeben.</Text>
                  <Text style={styles.sub}>
                    Wir haben einen Code an{'\n'}
                    <Text style={styles.kontaktHighlight}>{kontakt}</Text> gesendet.
                  </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(250).springify().damping(18)} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>6-stelliger Code</Text>
                  <TextInput
                    ref={codeRef}
                    style={[styles.input, styles.otpInput]}
                    placeholder="000000"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleOtpVerifizieren}
                    accessible
                    accessibilityLabel="Einmalcode"
                  />
                </Animated.View>

                {fehler ? (
                  <Text style={styles.fehler} role="alert">{fehler}</Text>
                ) : null}

                <Animated.View entering={FadeInDown.delay(340).springify()}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleOtpVerifizieren}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[D.color.gradientTop, D.color.gradientBottom]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.buttonLabel}>Einloggen</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.nochmal}
                    hitSlop={12}
                    onPress={() => otpFlow.codeSenden(kontakt)}
                    accessibilityRole="button"
                    accessibilityLabel="Code erneut senden"
                  >
                    <Text style={styles.nochmalText}>Code erneut senden</Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.datenschutzText}>
              Mit der Anmeldung stimmen Sie den{' '}
              <Text style={styles.datenschutzLink}>Nutzungsbedingungen</Text>
              {' '}und der{' '}
              <Text style={styles.datenschutzLink}>Datenschutzerklärung</Text>
              {' '}zu.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.color.dark },
  glow: {
    position: 'absolute', top: -80, left: '50%', marginLeft: -180,
    width: 360, height: 360, borderRadius: 180, overflow: 'hidden',
  },
  safeArea: { flex: 1 },
  kav: { flex: 1, paddingHorizontal: 28 },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoMark: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logoMarkText: { fontSize: 16, color: '#fff' },
  logoName: {
    fontSize: D.font.xl,
    fontWeight: D.font.heavy,
    color: D.color.inkInverted,
    letterSpacing: -0.5,
  },
  content: { flex: 1, paddingTop: 32, gap: 24 },
  zurück: {
    fontSize: D.font.md,
    color: D.color.gradientMid,
    fontWeight: D.font.semibold,
    marginBottom: 16,
  },
  headline: {
    fontSize: D.font.giant,
    fontWeight: D.font.heavy,
    color: D.color.inkInverted,
    letterSpacing: -1.5,
    lineHeight: D.font.giant * 1.06,
    marginBottom: 12,
  },
  sub: {
    fontSize: D.font.md,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 22,
  },
  kontaktHighlight: {
    color: D.color.gradientMid,
    fontWeight: D.font.semibold,
  },
  inputGroup: { gap: 8 },
  inputLabel: {
    fontSize: D.font.sm,
    fontWeight: D.font.semibold,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: D.color.darkCard,
    borderWidth: 1,
    borderColor: D.color.darkBorder,
    borderRadius: D.radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: D.font.lg,
    color: D.color.inkInverted,
    minHeight: 56,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: D.font.heavy,
    letterSpacing: 12,
    textAlign: 'center',
  },
  fehler: {
    fontSize: D.font.sm,
    color: D.color.error,
    fontWeight: D.font.medium,
    marginTop: -8,
  },
  button: {
    height: 56,
    borderRadius: D.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: {
    fontSize: D.font.lg,
    fontWeight: D.font.bold,
    color: D.color.inkInverted,
    letterSpacing: 0.2,
  },
  nochmal: { alignItems: 'center', paddingVertical: 14 },
  nochmalText: {
    fontSize: D.font.md,
    color: D.color.gradientMid,
    fontWeight: D.font.semibold,
  },
  footer: { paddingBottom: 16, paddingTop: 8 },
  datenschutzText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    lineHeight: 17,
  },
  datenschutzLink: { color: 'rgba(255,255,255,0.45)' },
});
