import React from 'react';
import { View, StatusBar, StyleSheet, type ViewStyle, type StatusBarStyle } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { D } from '@sanime/design-system';
import { SafeArea } from './SafeArea';

interface ScreenProps {
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  /** Rendert außerhalb/hinter der SafeArea, z.B. <HeroGlow/> oder ein <LinearGradient/> —
   * damit es hinter die Statusleiste/Notch reichen kann statt vom SafeArea-Padding
   * beschnitten zu werden. */
  background?: React.ReactNode;
  /** Standard nur oben — auf Screens mit eigenem Footer/CTA am unteren Rand `['top','bottom']` setzen. */
  edges?: Edge[];
  style?: ViewStyle;
  children: React.ReactNode;
}

/** Standard-Screen-Hülle: Hintergrund + StatusBar + SafeArea(top) — ersetzt die in fast
 * jedem Screen wiederholte `<View><StatusBar/><SafeAreaView edges={['top']}>`-Boilerplate. */
export function Screen({
  backgroundColor = D.color.bg,
  statusBarStyle = 'dark-content',
  background,
  edges = ['top'],
  style,
  children,
}: ScreenProps) {
  return (
    <View style={[styles.root, { backgroundColor }, style]}>
      <StatusBar barStyle={statusBarStyle} />
      {background}
      <SafeArea edges={edges}>{children}</SafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
