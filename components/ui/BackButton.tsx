import React from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { D } from '@sanime/design-system';

interface BackButtonProps {
  onPress: () => void;
  /** 'light' (Standard) = akzentfarbenes Icon auf hellem Grund; 'dark' = weißes Icon in
   * Glas-Kreis auf dunklem Kamera-Hintergrund. */
  variant?: 'light' | 'dark';
  icon?: React.ComponentProps<typeof Feather>['name'];
  size?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/** Konsolidiert den bisher in 7+ Screens identisch wiederholten Zurück-Button. */
export function BackButton({
  onPress,
  variant = 'light',
  icon = 'arrow-left',
  size = 44,
  accessibilityLabel = 'Zurück',
  style,
}: BackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={12}
      style={[
        styles.base,
        { width: size, height: size },
        variant === 'dark' && { borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.15)' },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Feather name={icon} size={22} color={variant === 'dark' ? '#FFFFFF' : D.color.accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
