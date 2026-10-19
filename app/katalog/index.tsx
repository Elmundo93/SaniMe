import React from 'react';
import { StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { KatalogStart } from '../../components/katalog/KatalogStart';

// Eigenständiger Katalog-Start für Einstiege aus Vollbild-Modals (`/einstieg`),
// aus denen nicht sauber in den Entdecken-Tab gesprungen werden kann. Ein
// `?categoryId=` (ältere Links) führt direkt zur Kategorie.
export default function KatalogScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  if (categoryId) return <Redirect href={{ pathname: '/katalog/kategorie/[id]', params: { id: categoryId } }} />;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Katalog" onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        <KatalogStart />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16, paddingBottom: 40 },
});
