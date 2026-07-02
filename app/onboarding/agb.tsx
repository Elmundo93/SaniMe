import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { D } from '@sanime/design-system';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { AGB_TEXT } from '../../constants/legal';

export default function AgbScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="AGB" onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.content}>
        <Text style={styles.text}>{AGB_TEXT}</Text>
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
  text: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 24 },
});
