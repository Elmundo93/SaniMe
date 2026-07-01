import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variante?: 'primary' | 'secondary' | 'ghost' | 'danger';
  größe?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  label,
  variante = 'primary',
  größe = 'md',
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variante],
        styles[`größe_${größe}`],
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variante === 'primary' ? Colors.white : Colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, styles[`label_${variante}`], styles[`labelGröße_${größe}`]]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
  },
  // Varianten
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.primaryLight,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  danger: {
    backgroundColor: Colors.errorBg,
  },
  disabled: {
    opacity: 0.5,
  },
  // Größen
  größe_sm: { paddingHorizontal: 16, paddingVertical: 10 },
  größe_md: { paddingHorizontal: 20, paddingVertical: 14 },
  größe_lg: { paddingHorizontal: 24, paddingVertical: 18 },
  // Labels
  label: { fontWeight: '600', letterSpacing: 0.2 },
  label_primary: { color: Colors.white },
  label_secondary: { color: Colors.primary },
  label_ghost: { color: Colors.ink },
  label_danger: { color: Colors.error },
  labelGröße_sm: { fontSize: 14 },
  labelGröße_md: { fontSize: 16 },
  labelGröße_lg: { fontSize: 18 },
});
