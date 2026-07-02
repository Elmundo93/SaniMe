import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BackButton } from './BackButton';
import { StepCounter } from '../onboarding/StepCounter';

interface CameraOverlayHeaderProps {
  onBack: () => void;
  schritt: number;
  gesamtSchritte?: number;
  icon?: React.ComponentProps<typeof Feather>['name'];
  accessibilityLabel?: string;
}

/** Konsolidiert den absolut positionierten Zurück-Button + StepCounter-Overlay,
 * bisher identisch dupliziert in rezept.tsx und krankenkasse.tsx. */
export function CameraOverlayHeader({
  onBack,
  schritt,
  gesamtSchritte = 11,
  icon = 'arrow-left',
  accessibilityLabel = 'Zurück',
}: CameraOverlayHeaderProps) {
  return (
    <SafeAreaView style={styles.topHint} edges={['top']}>
      <BackButton onPress={onBack} variant="dark" icon={icon} accessibilityLabel={accessibilityLabel} />
      <View style={styles.schrittAnzeige}>
        <StepCounter aktuellerSchritt={schritt} gesamtSchritte={gesamtSchritte} />
      </View>
      <View style={{ width: 44 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  schrittAnzeige: {
    flex: 1,
    alignItems: 'center',
  },
});
