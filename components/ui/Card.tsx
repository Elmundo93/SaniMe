import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { D, neutral, shadows } from '@sanime/design-system';

interface CardProps extends ViewProps {
  padding?: number;
  shadow?: boolean;
}

export function Card({ padding = 16, shadow = true, style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.card, shadow && shadows.low, { padding }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: neutral.surface,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: neutral.border,
  },
});
