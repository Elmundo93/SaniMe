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
import { useOnboardingStore } from '../../store/onboardingStore';
import { D } from '../../constants/design';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PremiumTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const starten = useOnboardingStore((s) => s.starten);

  // Nur diese beiden Routen bekommen eine sichtbare Kachel — dashboard/[id] (die
  // Versorgungsdetailseite) ist Teil desselben Tab-Stacks, aber kein eigener Tab.
  // (expo-router's `options.href: null` wirkt nur auf die Default-Tabbar, nicht auf
  // eine custom `tabBar`-Prop, deshalb filtern wir hier explizit über den Routennamen.)
  const SICHTBARE_TABS = ['dashboard/index', 'einstellungen/index'];
  const sichtbareRouten = state.routes
    .map((route: { key: string; name: string }, index: number) => ({ route, index }))
    .filter(({ route }: { route: { name: string } }) => SICHTBARE_TABS.includes(route.name));

  const tabBar = (
    <View style={styles.tabBar}>
      {sichtbareRouten.map(({ route, index }: { route: { key: string; name: string }; index: number }) => {
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

      {/* Floating Camera Button — außerhalb des overflow:hidden blurContainer, damit der
          pulsierende Glow des Buttons nicht am oberen Rand abgeschnitten wird. */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <CameraButton
          onPress={async () => {
            await starten();
            router.push('/scan/rezept');
          }}
          size={72}
        />
      </View>
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
        name="dashboard/index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="einstellungen/index"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
      {/* Versorgungsdetail: Teil des Tab-Stacks (per Card-Tap erreichbar), aber keine
          eigene Tab-Bar-Kachel — sonst erscheint sie als sichtbarer dritter Tab. */}
      <Tabs.Screen name="dashboard/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
    position: 'relative',
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
    // scrollbaren Dashboard-Content hineinreichen und konkurrierte dort um Taps.
    position: 'absolute',
    top: -16,
    left: '50%',
    marginLeft: -36,
    zIndex: 20,
    pointerEvents: 'auto',
  },
});
