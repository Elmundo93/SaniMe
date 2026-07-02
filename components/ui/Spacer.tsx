import React from 'react';
import { View } from 'react-native';

interface SpacerProps {
  height?: number;
  width?: number;
}

/** Ersetzt Ad-hoc-`<View style={{ height: N }} />`-Platzhalter durch einen benannten Baustein. */
export function Spacer({ height, width }: SpacerProps) {
  return <View style={{ height, width }} />;
}
