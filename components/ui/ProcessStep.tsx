import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { D } from '@sanime/design-system';

export type StepStatus = 'done' | 'active' | 'pending';

interface ProcessStepProps {
  label: string;
  status: StepStatus;
  isLast?: boolean;
  index: number;
  datum?: string;
}

export function ProcessStep({ label, status, isLast = false, index, datum }: ProcessStepProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (status === 'active') {
      pulse.value = withRepeat(
        withSpring(1.5, D.spring.breath),
        -1,
        true,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const dotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: status === 'active' ? 0.3 : 0,
  }));

  const dotColor =
    status === 'done'   ? D.color.success :
    status === 'active' ? D.color.accent  :
                          D.color.inkTertiary;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(18)}
      style={styles.row}
    >
      {/* Punkt-Spalte */}
      <View style={styles.dotCol}>
        {/* Pulse-Ring für aktiven Schritt */}
        <Animated.View
          style={[
            styles.pulsRing,
            { backgroundColor: D.color.accent },
            dotPulseStyle,
          ]}
        />
        {/* Haupt-Dot */}
        <View
          style={[
            styles.dot,
            { backgroundColor: status === 'pending' ? 'transparent' : dotColor },
            status === 'pending' && { borderWidth: 1.5, borderColor: D.color.inkTertiary },
            status === 'active'  && { borderWidth: 2, borderColor: D.color.accent, backgroundColor: D.color.bg },
          ]}
        >
          {status === 'done' && (
            <Feather name="check" size={11} color="#fff" />
          )}
          {status === 'active' && (
            <View style={[styles.activeDot, { backgroundColor: D.color.accent }]} />
          )}
        </View>

        {/* Verbindungslinie */}
        {!isLast && (
          <View
            style={[
              styles.line,
              { backgroundColor: status === 'done' ? D.color.success : D.color.inkTertiary + '44' },
            ]}
          />
        )}
      </View>

      {/* Label + Datum */}
      <View style={styles.labelWrap}>
        <Text
          style={[
            styles.label,
            status === 'done'   && styles.labelDone,
            status === 'active' && styles.labelActive,
            status === 'pending' && styles.labelPending,
          ]}
        >
          {label}
        </Text>
        {datum ? <Text style={styles.datum}>{datum}</Text> : null}
      </View>
    </Animated.View>
  );
}

const DOT = 18;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 36,
  },
  dotCol: {
    alignItems: 'center',
    width: DOT,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pulsRing: {
    position: 'absolute',
    top: 0,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    zIndex: 0,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  line: {
    width: 1.5,
    flex: 1,
    marginTop: 3,
    minHeight: 18,
  },
  labelWrap: {
    flex: 1,
    paddingTop: 1,
    gap: 2,
  },
  label: {
    fontSize: D.font.md,
  },
  datum: {
    fontSize: D.font.xs,
    color: D.color.inkTertiary,
    fontWeight: D.font.regular,
    marginTop: 1,
  },
  labelDone: {
    color: D.color.ink,
    fontWeight: D.font.medium,
  },
  labelActive: {
    color: D.color.accent,
    fontWeight: D.font.semibold,
  },
  labelPending: {
    color: D.color.inkTertiary,
    fontWeight: D.font.regular,
  },
});
