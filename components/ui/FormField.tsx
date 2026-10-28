import React from 'react';
import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { D } from '@sanime/design-system';

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
  autoComplete?: TextInputProps['autoComplete'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  // iOS-Autofill, z. B. 'oneTimeCode' (Code aus der SMS) oder 'telephoneNumber'.
  textContentType?: TextInputProps['textContentType'];
  maxLength?: number;
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
  autoComplete,
  autoCapitalize,
  textContentType,
  maxLength,
}: FormFieldProps) {
  return (
    <View style={styles.feld}>
      {/* Sichtbare Beschriftung — für VoiceOver trägt das Feld selbst das
          Label, sonst wird es doppelt angesagt. */}
      <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {label}
      </Text>
      <TextInput
        style={[styles.input, !!error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        editable={editable}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType}
        maxLength={maxLength}
        autoCorrect={autoCapitalize === 'none' ? false : undefined}
        placeholderTextColor={D.color.inkTertiary}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      {!!error && (
        <Text style={styles.errorText} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      )}
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
