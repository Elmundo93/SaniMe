import React from 'react';
import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { D } from '../../constants/design';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  editable?: boolean;
  placeholder?: string;
  accessibilityHint?: string;
}

// Generalisierte Texteingabe (Checkout E-Mail/Telefon etc.) — für OCR-Felder mit
// Confidence-Anzeige siehe components/onboarding/DatenFeld.tsx.
export function FormField({
  label,
  value,
  onChangeText,
  error,
  keyboardType,
  autoFocus,
  editable = true,
  placeholder,
  accessibilityHint,
}: FormFieldProps) {
  return (
    <View style={styles.feld}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !!error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={D.color.inkTertiary}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  feld: { gap: 6 },
  label: { fontSize: D.font.sm, fontWeight: D.font.semibold, color: D.color.inkSecondary },
  input: {
    fontSize: D.font.md,
    color: D.color.ink,
    fontWeight: D.font.medium,
    borderBottomWidth: 2,
    borderBottomColor: D.color.glassBorder,
    paddingVertical: 10,
    minHeight: 44,
  },
  inputError: { borderBottomColor: D.color.error },
  errorText: { fontSize: 12, color: D.color.error, fontWeight: D.font.semibold },
});
