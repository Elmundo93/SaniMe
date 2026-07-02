import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import { D, neutral } from '@sanime/design-system';

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
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const [pressed, setPressed] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[
        styles.base,
        styles[variante],
        styles[`größe_${größe}`],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variante === 'primary' ? D.color.inkInverted : D.color.accent}
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
    borderRadius: D.radius.sm,
    gap: 8,
    minHeight: 44,
  },
  // Varianten
  primary: {
    backgroundColor: D.color.accent,
  },
  secondary: {
    backgroundColor: D.color.accentLight,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: neutral.border,
  },
  danger: {
    backgroundColor: D.color.errorLight,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
  label_primary: { color: D.color.inkInverted },
  label_secondary: { color: D.color.accent },
  label_ghost: { color: D.color.ink },
  label_danger: { color: D.color.error },
  labelGröße_sm: { fontSize: 14 },
  labelGröße_md: { fontSize: 16 },
  labelGröße_lg: { fontSize: 18 },
});
