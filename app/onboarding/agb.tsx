import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { D } from '../../constants/design';
import { AGB_TEXT } from '../../constants/legal';

export default function AgbScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.zurückBtn}
            accessibilityRole="button"
            accessibilityLabel="Zurück"
          >
            <Text style={styles.zurückIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitel}>AGB</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <Text style={styles.text}>{AGB_TEXT}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.color.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: D.color.glassBorder,
    gap: 12, backgroundColor: D.color.bgSoft,
  },
  zurückBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zurückIcon: { fontSize: 22, color: D.color.accent },
  headerTitel: { flex: 1, fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.ink, textAlign: 'center' },
  content: { padding: 24 },
  text: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 24 },
});
