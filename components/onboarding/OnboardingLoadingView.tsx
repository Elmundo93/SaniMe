import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { D } from '@sanime/design-system';

// Wird gezeigt, während useOnboardingGuard die Session hydriert oder einen
// Fehlnavigations-Redirect ausführt — verhindert einen weißen/falschen Flash
// zwischen den dunklen Onboarding-/Scan-Hintergründen.
export function OnboardingLoadingView() {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={D.color.inkInverted} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D.color.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
