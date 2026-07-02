import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { D } from '@sanime/design-system';

interface AvatarProps {
  initials: string;
  size?: number;
  fontSize?: number;
  variant?: 'flat' | 'gradient';
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Avatar({
  initials,
  size = 46,
  fontSize,
  variant = 'flat',
  onPress,
  accessibilityLabel,
}: AvatarProps) {
  const containerStyle = [
    styles.base,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    variant === 'flat' && styles.flat,
  ];
  const textStyle = {
    fontSize: fontSize ?? Math.round(size * 0.3),
    fontWeight: D.font.bold,
    color: variant === 'gradient' ? D.color.inkInverted : D.color.accent,
  };

  const content = (
    <>
      {variant === 'gradient' && (
        <LinearGradient
          colors={[D.color.gradientTop, D.color.gradientBottom]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text style={textStyle}>{initials}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={containerStyle}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle} accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  flat: {
    backgroundColor: D.color.accentLight,
    borderWidth: 1.5,
    borderColor: 'rgba(63,139,255,0.18)',
  },
});
