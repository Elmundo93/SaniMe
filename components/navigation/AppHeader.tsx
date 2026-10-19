import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { D } from '@sanime/design-system';
import { SaniMeLogo } from '../ui/SaniMeLogo';

interface AppHeaderProps {
  /** Anzahl offener Aufgaben — 0 blendet das Zähler-Badge an der Glocke aus. */
  benachrichtigungen: number;
  onBenachrichtigungen: () => void;
  onEinstellungen: () => void;
}

function HeaderIcon({
  icon,
  onPress,
  accessibilityLabel,
  badge = 0,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  badge?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.iconButton}
      hitSlop={6}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Feather name={icon} size={22} color={D.color.ink} />
      {badge > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Kopfzeile der Start-Ansicht: Glocke links, Logo mittig, Einstellungen rechts. */
export function AppHeader({ benachrichtigungen, onBenachrichtigungen, onEinstellungen }: AppHeaderProps) {
  const glockenLabel =
    benachrichtigungen > 0
      ? `Benachrichtigungen, ${benachrichtigungen} ${benachrichtigungen === 1 ? 'offene Aufgabe' : 'offene Aufgaben'}`
      : 'Benachrichtigungen';

  return (
    <View style={styles.header}>
      <HeaderIcon
        icon="bell"
        onPress={onBenachrichtigungen}
        accessibilityLabel={glockenLabel}
        badge={benachrichtigungen}
      />
      <View style={styles.logo}>
        <SaniMeLogo />
      </View>
      <HeaderIcon icon="settings" onPress={onEinstellungen} accessibilityLabel="Einstellungen" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  logo: {
    flex: 1,
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: D.color.error,
    borderWidth: 1.5,
    borderColor: D.color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: D.font.bold,
    color: D.color.inkInverted,
  },
});
