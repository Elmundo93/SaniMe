import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { useGlowPulse } from '../../hooks/useGlowPulse';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { LoadingState } from '../../components/ui/LoadingState';
import { IconButton } from '../../components/ui/IconButton';
import { CameraOverlayHeader } from '../../components/ui/CameraOverlayHeader';
import { simuliereKrankenkasseOcr } from '../../lib/mockOcr';
import { sucheKundeImArchiv } from '../../lib/mockKundenArchiv';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { useAuthStore } from '../../store/authStore';
import { useVersorgungStore } from '../../store/versorgungStore';
import { D } from '@sanime/design-system';

function zeigeOcrFehler() {
  Alert.alert(
    'Krankenkassenkarte konnte nicht erkannt werden',
    'Wir konnten die Karte nicht vollständig auslesen. Bitte überprüfe die Beleuchtung und versuche es erneut.',
  );
}

const { width, height } = Dimensions.get('window');
const CARD_W = width * 0.82;
const CARD_H = CARD_W * 0.628; // Standard Scheckkartenformat

export default function KrankenkasseScreen() {
  const router = useRouter();
  const { ready } = useOnboardingGuard('KRANKENKASSE_AUFNAHME');
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const setBenutzer = useAuthStore((s) => s.setBenutzer);
  const onboardingAbschliessen = useAuthStore((s) => s.onboardingAbschliessen);
  const versorgungenSetzen = useVersorgungStore((s) => s.versorgungenSetzen);
  const [permission, requestPermission] = useCameraPermissions();
  const [aufgenommen, setAufgenommen] = useState(false);
  const [verarbeitung, setVerarbeitung] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const glowStyle = useGlowPulse();

  if (!ready) return <OnboardingLoadingView />;

  // Versichertennummer gegen den (mock) Kundenstamm prüfen — bei Treffer kennen wir
  // den Kunden bereits: Identität + Versorgungshistorie übernehmen und direkt ins
  // Dashboard, statt Kontaktdaten/OTP später in Checkout nochmal abzufragen. Die
  // laufende Bestellung bleibt als Session unangetastet und lässt sich später über
  // den Kamera-Button im Dashboard fortsetzen. Ist bereits ein benutzer eingeloggt
  // (Folgeauftrag), bleibt dessen echte Identität unangetastet statt sie mit dem
  // Archiv-Platzhalter zu überschreiben.
  const pruefeArchivTreffer = async (versichertenNr: string): Promise<boolean> => {
    if (useAuthStore.getState().benutzer) return false;
    const treffer = await sucheKundeImArchiv(versichertenNr);
    if (!treffer) return false;
    await setBenutzer(treffer.benutzer, `archiv-token-${treffer.benutzer.id}`);
    versorgungenSetzen(treffer.versorgungen);
    await onboardingAbschliessen();
    return true;
  };

  const handleZurück = async () => {
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const handleFotoAufnehmen = async () => {
    if (aufgenommen || !cameraRef.current) return;
    setAufgenommen(true);

    try {
      const foto = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!foto?.uri) { setAufgenommen(false); return; }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVerarbeitung(true);
      // Simulierte OCR-Verarbeitung (in Produktion: API-Aufruf)
      const { krankenkasse, confidence, produkte } = await simuliereKrankenkasseOcr();
      const result = await dispatch({
        type: 'KRANKENKASSE_OCR_ABGESCHLOSSEN',
        uri: foto.uri,
        krankenkasse,
        confidence,
        produkte,
      });
      if (result.ok) {
        if (await pruefeArchivTreffer(krankenkasse.versichertenNr)) {
          router.replace('/(app)/dashboard');
        } else {
          router.push(STATUS_META[result.session.status].route as any);
        }
      } else {
        zeigeDispatchFehler();
      }
    } catch {
      zeigeOcrFehler();
    } finally {
      setAufgenommen(false);
      setVerarbeitung(false);
    }
  };

  const handleGalerie = async () => {
    const galerieResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (galerieResult.canceled || !galerieResult.assets[0]?.uri) return;

    setVerarbeitung(true);
    try {
      const { krankenkasse, confidence, produkte } = await simuliereKrankenkasseOcr();
      const result = await dispatch({
        type: 'KRANKENKASSE_OCR_ABGESCHLOSSEN',
        uri: galerieResult.assets[0].uri,
        krankenkasse,
        confidence,
        produkte,
      });
      if (result.ok) {
        if (await pruefeArchivTreffer(krankenkasse.versichertenNr)) {
          router.replace('/(app)/dashboard');
        } else {
          router.push(STATUS_META[result.session.status].route as any);
        }
      } else {
        zeigeDispatchFehler();
      }
    } catch {
      zeigeOcrFehler();
    } finally {
      setVerarbeitung(false);
    }
  };

  const handleÜberspringen = async () => {
    setVerarbeitung(true);
    try {
      const { produkte } = await simuliereKrankenkasseOcr();
      const result = await dispatch({ type: 'KRANKENKASSE_UEBERSPRUNGEN', produkte });
      if (result.ok) {
        router.push(STATUS_META[result.session.status].route as any);
      } else {
        zeigeDispatchFehler();
      }
    } catch {
      zeigeOcrFehler();
    } finally {
      setVerarbeitung(false);
    }
  };

  if (verarbeitung) {
    return (
      <LoadingState
        title="Krankenkassendaten werden geprüft…"
        subtitle="Das dauert nur einen Moment"
        steps={['Bildanalyse', 'Text extrahieren', 'Daten prüfen']}
      />
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={"#FFFFFF"} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <Feather name="camera" size={48} color="#FFFFFF" style={{ marginBottom: 16 }} />
        <Text style={styles.permissionTitle}>Kamerazugriff benötigt</Text>
        <Text style={styles.permissionText}>
          SaniMe benötigt die Kamera, um deine Krankenkassenkarte zu fotografieren. Wir können auch ein Foto aus deiner Galerie verwenden.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
          accessibilityRole="button"
          accessibilityLabel={permission.canAskAgain ? 'Kamera erlauben' : 'Einstellungen öffnen'}
        >
          <Text style={styles.permissionButtonText}>
            {permission.canAskAgain ? 'Kamera erlauben' : 'Einstellungen öffnen'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleGalerie}
          style={{ marginTop: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Foto aus Galerie wählen"
        >
          <Text style={styles.abbrechen}>Foto aus Galerie wählen</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleÜberspringen} style={{ marginTop: 16 }} accessibilityRole="button">
          <Text style={styles.abbrechen}>Karte bereits hinterlegt — überspringen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {permission.granted && <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef} />}

      {/* Dimm-Overlay */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.dimm, { height: (height - CARD_H) / 2 - 10 }]} />
        <View style={styles.mitteRow}>
          <View style={[styles.dimm, { width: (width - CARD_W) / 2 }]} />
          <View style={{ width: CARD_W, height: CARD_H }} />
          <View style={[styles.dimm, { width: (width - CARD_W) / 2 }]} />
        </View>
        <View style={[styles.dimm, { flex: 1 }]} />
      </View>

      {/* Rahmen */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.frame,
          glowStyle,
          {
            width: CARD_W,
            height: CARD_H,
            top: (height - CARD_H) / 2 - 10,
            left: (width - CARD_W) / 2,
            borderRadius: 12,
          },
        ]}
      >
        {['tl', 'tr', 'bl', 'br'].map((pos) => (
          <View key={pos} style={[styles.corner, styles[pos as 'tl']]} />
        ))}
      </Animated.View>

      {/* Header */}
      <CameraOverlayHeader onBack={handleZurück} schritt={STATUS_META.KRANKENKASSE_AUFNAHME.schritt} />

      {/* Footer */}
      <SafeAreaView style={styles.bottomHint} edges={['bottom']}>
        <Text style={styles.hinweisText}>Krankenkassenkarte fotografieren</Text>
        <Text style={styles.hinweisSubText}>Vorderseite der Karte in den Rahmen halten</Text>

        <View style={styles.controlsRow}>
          <IconButton icon="image" onPress={handleGalerie} accessibilityLabel="Galerie öffnen" />

          <TouchableOpacity
            style={[styles.aufnahmeButton, aufgenommen && styles.aufnahmeButtonDisabled]}
            onPress={handleFotoAufnehmen}
            disabled={aufgenommen}
            accessibilityLabel="Foto aufnehmen"
            activeOpacity={0.8}
          >
            {aufgenommen ? (
              <ActivityIndicator color={"#FFFFFF"} size="small" />
            ) : (
              <View style={styles.aufnahmeButtonInner} />
            )}
          </TouchableOpacity>

          <View style={styles.sideButtonPlatzhalter} />
        </View>

        <TouchableOpacity
          onPress={handleÜberspringen}
          style={styles.überspringenButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Karte bereits hinterlegt, überspringen"
        >
          <Text style={styles.überspringenText}>Karte bereits hinterlegt — überspringen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  permissionContainer: {
    flex: 1,
    backgroundColor: D.color.dark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  permissionText: {
    fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  permissionButton: {
    backgroundColor: D.color.accent, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14,
    minHeight: 44, justifyContent: 'center',
  },
  permissionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  abbrechen: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  dimm: { backgroundColor: 'rgba(0,0,0,0.62)' },
  mitteRow: { flexDirection: 'row', height: CARD_H + 20 },
  frame: { position: 'absolute', zIndex: 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: '#FFFFFF' },
  tl: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  tr: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  br: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  bottomHint: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    alignItems: 'center', paddingBottom: 20, paddingTop: 16, gap: 6,
  },
  hinweisText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  hinweisSubText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center',
    paddingHorizontal: 40, marginBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 48, width: '100%', marginTop: 8,
  },
  sideButtonPlatzhalter: { width: 50, height: 50 },
  aufnahmeButton: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)',
  },
  aufnahmeButtonDisabled: { backgroundColor: D.color.accent },
  aufnahmeButtonInner: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)',
  },
  überspringenButton: { marginTop: 8, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  überspringenText: { color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecorationLine: 'underline' },
});
