import React from 'react';
import { TouchableOpacity, StyleSheet, type TouchableOpacityProps } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface IconButtonProps extends TouchableOpacityProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  size?: number;
}

/** Kreisförmiger Glass-Icon-Button auf dunklem Grund — Galerie-/Hilfe-Auslöser der Kamera-Screens. */
export function IconButton({ icon, size = 50, style, ...rest }: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, style]}
      {...rest}
    >
      <Feather name={icon} size={24} color="rgba(255,255,255,0.85)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
