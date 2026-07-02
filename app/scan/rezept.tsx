import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
import { simuliereRezeptOcr } from '../../lib/mockOcr';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';

const { width, height } = Dimensions.get('window');
const FRAME_W = width * 0.82;
const FRAME_H = FRAME_W * 1.41; // DIN A5 proportional

export default function RezeptScanScreen() {
  const router = useRouter();
  const { ready } = useOnboardingGuard('REZEPT_AUFNAHME');
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const [permission, requestPermission] = useCameraPermissions();
  const [aufgenommen, setAufgenommen] = useState(false);
  const [verarbeitung, setVerarbeitung] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const glowStyle = useGlowPulse();

  if (!ready) return <OnboardingLoadingView />;

  const handleZurück = async () => {
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const nachAufnahme = async (uri: string) => {
    setVerarbeitung(true);
    try {
      const { result, confidence } = await simuliereRezeptOcr();
      const transitionResult = await dispatch({ type: 'REZEPT_OCR_ABGESCHLOSSEN', uri, result, confidence });
      if (transitionResult.ok) {
        router.push(STATUS_META[transitionResult.session.status].route as any);
      } else {
        zeigeDispatchFehler();
      }
    } catch {
      Alert.alert(
        'Rezept konnte nicht erkannt werden',
        'Wir konnten dein Rezept nicht vollständig auslesen. Bitte überprüfe die Beleuchtung und versuche es erneut.',
      );
    } finally {
      setVerarbeitung(false);
      setAufgenommen(false);
    }
  };

  if (verarbeitung) {
    return (
      <LoadingState
        title="KI liest dein Rezept aus…"
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
          SaniMe benötigt die Kamera, um dein Rezept zu fotografieren. Wir können auch ein Foto aus deiner Galerie verwenden.
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
      </SafeAreaView>
    );
  }

  async function handleGalerie() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await nachAufnahme(result.assets[0].uri);
    }
  }

  const handleHilfe = () => {
    Alert.alert(
      'Tipps zum Scannen',
      '• Lege das Rezept auf eine ebene Fläche\n• Sorge für gute Beleuchtung\n• Halte die Kamera ruhig\n• Alle vier Ecken müssen sichtbar sein',
      [{ text: 'Verstanden' }],
    );
  };

  const handleFotoAufnehmen = async () => {
    if (aufgenommen || !cameraRef.current) return;
    setAufgenommen(true);

    try {
      const foto = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: false,
      });

      if (foto?.uri) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await nachAufnahme(foto.uri);
      }
    } catch {
      setAufgenommen(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef} />

      {/* Dark-blue gradient tint over camera feed */}
      <LinearGradient
        colors={['rgba(8,14,32,0.55)', 'rgba(8,14,32,0.0)', 'rgba(8,14,32,0.72)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Dimm-Overlay */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Top */}
        <View style={[styles.dimm, { height: (height - FRAME_H) / 2 - 10 }]} />
        {/* Mitte */}
        <View style={styles.mitteRow}>
          <View style={[styles.dimm, { width: (width - FRAME_W) / 2 }]} />
          <View style={styles.frameKlar} />
          <View style={[styles.dimm, { width: (width - FRAME_W) / 2 }]} />
        </View>
        {/* Unten */}
        <View style={[styles.dimm, { flex: 1 }]} />
      </View>

      {/* Rahmen-Ecken */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.frame,
          glowStyle,
          {
            width: FRAME_W,
            height: FRAME_H,
            top: (height - FRAME_H) / 2 - 10,
            left: (width - FRAME_W) / 2,
          },
        ]}
      >
        {['tl', 'tr', 'bl', 'br'].map((pos) => (
          <View key={pos} style={[styles.corner, styles[pos as 'tl']]} />
        ))}
      </Animated.View>

      {/* Hinweis oben */}
      <CameraOverlayHeader
        onBack={handleZurück}
        schritt={STATUS_META.REZEPT_AUFNAHME.schritt}
        icon="x"
        accessibilityLabel="Schließen"
      />

      {/* Hinweis unten */}
      <SafeAreaView style={styles.bottomHint} edges={['bottom']}>
        <Text style={styles.hinweisText}>Positioniere dein Rezept</Text>
        <Text style={styles.hinweisSubText}>Achte auf gute Beleuchtung</Text>

        <View style={styles.controlsRow}>
          {/* Galerie */}
          <IconButton icon="image" onPress={handleGalerie} accessibilityLabel="Galerie öffnen" />

          {/* Kamera-Auslöser */}
          <TouchableOpacity
            style={[styles.aufnahmeButton, aufgenommen && styles.aufnahmeButtonActive]}
            onPress={handleFotoAufnehmen}
            disabled={aufgenommen}
            accessibilityLabel="Foto aufnehmen"
            activeOpacity={0.8}
          >
            {aufgenommen ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.aufnahmeButtonInner} />
            )}
          </TouchableOpacity>

          {/* Hilfe */}
          <IconButton icon="help-circle" onPress={handleHilfe} accessibilityLabel="Hilfe" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: D.color.dark,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: D.color.dark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  permissionButton: {
    backgroundColor: D.color.accent,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  abbrechen: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  dimm: {
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  mitteRow: {
    flexDirection: 'row',
    height: FRAME_H + 20,
  },
  frameKlar: {
    width: FRAME_W,
    height: FRAME_H + 20,
  },
  frame: {
    position: 'absolute',
    zIndex: 2,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
  },
  tl: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  tr: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  br: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  bottomHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 16,
    gap: 6,
  },
  hinweisText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hinweisSubText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    width: '100%',
    marginTop: 8,
  },
  aufnahmeButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: D.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(63,139,255,0.5)',
  },
  aufnahmeButtonActive: {
    backgroundColor: D.color.gradientBottom,
  },
  aufnahmeButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
});
