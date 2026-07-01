import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { CameraButton } from '../../components/ui/CameraButton';
import { D } from '../../constants/design';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PremiumTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();

  const tabBar = (
    <View style={styles.tabBar}>
      {state.routes.map((route: { key: string; name: string }, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={label}
            hitSlop={8}
          >
            <View style={styles.tabIconWrap}>
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? D.color.accent : D.color.inkTertiary,
                size: 22,
              })}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Floating Camera Button — mittig, schwebt über der Tab-Bar */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <CameraButton onPress={() => router.push('/scan/rezept')} size={72} />
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      {Platform.OS === 'ios' ? (
        <View style={styles.blurContainer}>
          <BlurView intensity={80} tint="extraLight" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.blurTint]} />
          {tabBar}
        </View>
      ) : (
        <View style={[styles.blurContainer, styles.androidBg]}>
          {tabBar}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Verlauf',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="einstellungen"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
  },
  blurContainer: {
    overflow: 'hidden',
    borderTopWidth: 0.5,
    borderTopColor: D.color.glassBorder,
    position: 'relative',
  },
  blurTint: {
    backgroundColor: 'rgba(247,249,252,0.35)',
  },
  androidBg: {
    backgroundColor: D.color.bgSoft,
    borderTopColor: D.color.glassBorder,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 8 : 0,
    minHeight: 56,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 44,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: D.font.medium,
    color: D.color.inkTertiary,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: D.color.accent,
    fontWeight: D.font.semibold,
  },
  fabWrap: {
    // Schwebt bewusst nur knapp über der Tab-Bar (statt weiter in die Scene hinein) —
    // ein größerer negativer top-Wert ließ den runden Touch-Bereich des FABs bis in
    // scrollbaren Content hineinreichen und konkurrierte dort mit Elementen wie dem
    // "Details anzeigen"-Button auf dem Dashboard um Taps (siehe CLAUDE.md).
    position: 'absolute',
    top: -16,
    left: '50%',
    marginLeft: -36,
    zIndex: 20,
    pointerEvents: 'auto',
  },
});
