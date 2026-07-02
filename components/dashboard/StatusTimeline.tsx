import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { D } from '../../constants/design';
import type { TimelineEvent } from '../../types';

interface StatusTimelineProps {
  events: TimelineEvent[];
}

function formatZeit(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusTimeline({ events }: StatusTimelineProps) {
  return (
    <View style={styles.container}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const isActive = !event.abgeschlossen && index > 0 && events[index - 1]?.abgeschlossen;

        return (
          <View key={event.id} style={styles.row}>
            <View style={styles.lineContainer}>
              <View
                style={[
                  styles.dot,
                  event.abgeschlossen && styles.dotDone,
                  isActive && styles.dotActive,
                ]}
              />
              {!isLast && (
                <View style={[styles.line, event.abgeschlossen && styles.lineDone]} />
              )}
            </View>

            <View style={[styles.content, !isLast && { marginBottom: 16 }]}>
              <Text
                style={[
                  styles.label,
                  event.abgeschlossen && styles.labelDone,
                  isActive && styles.labelActive,
                ]}
              >
                {event.label}
              </Text>
              <Text style={styles.beschreibung}>{event.beschreibung}</Text>
              {event.zeitpunkt ? (
                <Text style={styles.zeitpunkt}>{formatZeit(event.zeitpunkt)}</Text>
              ) : (
                <Text style={[styles.zeitpunkt, styles.ausstehend]}>Ausstehend</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  lineContainer: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(63,139,255,0.2)',
    backgroundColor: D.color.bg,
  },
  dotDone: {
    backgroundColor: D.color.success,
    borderColor: D.color.success,
  },
  dotActive: {
    backgroundColor: D.color.bg,
    borderColor: D.color.accent,
    borderWidth: 3,
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: 'rgba(63,139,255,0.12)',
    marginTop: 4,
  },
  lineDone: {
    backgroundColor: 'rgba(52,199,89,0.3)',
  },
  content: {
    flex: 1,
    paddingBottom: 4,
  },
  label: {
    fontSize: D.font.md,
    fontWeight: D.font.semibold,
    color: D.color.inkTertiary,
    marginBottom: 2,
  },
  labelDone: {
    color: D.color.ink,
  },
  labelActive: {
    color: D.color.accent,
  },
  beschreibung: {
    fontSize: D.font.sm,
    color: D.color.inkSecondary,
    marginBottom: 3,
    lineHeight: 18,
  },
  zeitpunkt: {
    fontSize: 11,
    color: D.color.inkTertiary,
  },
  ausstehend: {
    fontStyle: 'italic',
  },
});
