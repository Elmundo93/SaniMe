import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Colors } from '../constants/colors';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seite nicht gefunden</Text>
      <Link href="/" style={styles.link}>
        Zurück zur Startseite
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 16,
  },
  link: {
    color: Colors.primary,
    fontSize: 16,
  },
});
