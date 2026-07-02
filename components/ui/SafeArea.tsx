import React from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import type { ViewStyle } from 'react-native';

interface SafeAreaProps {
  edges?: Edge[];
  style?: ViewStyle;
  children: React.ReactNode;
}

/** Dünner Wrapper um SafeAreaView mit dem im Code durchgängig genutzten Default (nur oben). */
export function SafeArea({ edges = ['top'], style, children }: SafeAreaProps) {
  return (
    <SafeAreaView style={[{ flex: 1 }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
