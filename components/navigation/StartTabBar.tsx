import React from 'react';
import { Animated, Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { D } from '@sanime/design-system';

const MAX_TAB_BREITE = 140;
const TITEL_EINZUG = 20;

export interface StartTabConfig {
  name: string;
  titel: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  /** Zähler am Icon, z.B. offene Aufgaben — 0/undefined = kein Badge. */
  badge?: number;
}

interface StartTabBarProps extends MaterialTopTabBarProps {
  configs: StartTabConfig[];
}

/** Swipebare Top-Tab-Leiste nach dem Vorbild von Signaros ModeTabBar: Icon-Reihe mit einem
 * einzelnen, der Wischgeste 1:1 folgenden Indikator, darunter ein mitgleitender Titel. */
export function StartTabBar({ state, navigation, position, configs }: StartTabBarProps) {
  const { width } = useWindowDimensions();
  const configMap = new Map(configs.map((c) => [c.name, c]));
  const routen: { key: string; name: string }[] = state.routes;

  const tabBreite = Math.min(width / routen.length, MAX_TAB_BREITE);
  const titelBreite = width - TITEL_EINZUG * 2;
  const eingabe = routen.map((_, i) => i);

  const indikatorX = position.interpolate({
    inputRange: eingabe,
    outputRange: routen.map((_, i) => i * tabBreite),
  });
  const titelX = position.interpolate({
    inputRange: eingabe,
    outputRange: routen.map((_, i) => -i * titelBreite),
  });

  return (
    <View>
      <View style={[styles.iconReihe, { width: tabBreite * routen.length }]} accessibilityRole="tablist">
        {routen.map((route, index) => {
          const cfg = configMap.get(route.name);
          if (!cfg) return null;
          const aktiv = state.index === index;
          const badge = cfg.badge ?? 0;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!aktiv && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktiv }}
              accessibilityLabel={badge > 0 ? `${cfg.titel}, ${badge} offen` : cfg.titel}
            >
              <View>
                <Feather name={cfg.icon} size={22} color={aktiv ? D.color.accent : D.color.inkTertiary} />
                {badge > 0 && <View style={styles.badgePunkt} pointerEvents="none" />}
              </View>
            </Pressable>
          );
        })}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.indikator,
            {
              left: tabBreite * 0.2,
              width: tabBreite * 0.6,
              transform: [{ translateX: indikatorX }],
            },
          ]}
        />
      </View>

      <View style={styles.titelFenster} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Animated.View style={[styles.titelStreifen, { transform: [{ translateX: titelX }] }]}>
          {routen.map((route) => (
            <Text key={route.key} style={[styles.titel, { width: titelBreite }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {configMap.get(route.name)?.titel ?? ''}
            </Text>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconReihe: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  badgePunkt: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: D.color.warning,
  },
  indikator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: D.color.accent,
  },
  titelFenster: {
    overflow: 'hidden',
    marginHorizontal: TITEL_EINZUG,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11,18,32,0.08)',
  },
  titelStreifen: {
    flexDirection: 'row',
  },
  titel: {
    fontSize: D.font.xxl,
    fontWeight: D.font.heavy,
    color: D.color.ink,
    letterSpacing: -0.8,
  },
});
