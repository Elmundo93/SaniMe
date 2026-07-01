import React from 'react';
import { Pressable, View, Text, StyleSheet, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { D } from '../../constants/design';

interface CheckboxProps {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  accessibilityHint?: string;
  dark?: boolean;
  style?: ViewStyle;
}

// Hit-Target ist per hitSlop auf 44×44 vergrößert, die sichtbare Box bleibt 24×24
// (bestehendes Muster aus app/onboarding/datenschutz.tsx), Layout bleibt unverändert.
export function Checkbox({ checked, onToggle, label, disabled, accessibilityHint, dark, style }: CheckboxProps) {
  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    onToggle(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.row, disabled && styles.rowDisabled, style]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      hitSlop={10}
    >
      <View style={[styles.box, dark && styles.boxDark, checked && (dark ? styles.boxActiveDark : styles.boxActive)]}>
        {checked && <Text style={styles.check}>✓</Text>}
      </View>
      <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
    </Pressable>
  );
}

const BOX = 24;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  rowDisabled: { opacity: 0.5 },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: D.color.inkTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  boxDark: { borderColor: 'rgba(255,255,255,0.25)' },
  boxActive: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  boxActiveDark: { backgroundColor: D.color.gradientMid, borderColor: D.color.gradientMid },
  check: { color: '#fff', fontSize: 13, fontWeight: D.font.bold },
  label: { flex: 1, fontSize: D.font.sm, color: D.color.inkSecondary, lineHeight: 19, paddingTop: 2 },
  labelDark: { color: 'rgba(255,255,255,0.6)' },
});
