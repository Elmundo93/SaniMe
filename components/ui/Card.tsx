import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { Colors } from '../../constants/colors';

interface CardProps extends ViewProps {
  padding?: number;
  shadow?: boolean;
}

export function Card({ padding = 16, shadow = true, style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.card, shadow && styles.shadow, { padding }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});
