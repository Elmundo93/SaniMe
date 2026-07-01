import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import type { TimelineEvent } from '../../types';

interface StatusTimelineProps {
  events: TimelineEvent[];
}

function formatZeit(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('de-DE', {
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
            {/* Linie links */}
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

            {/* Inhalt */}
            <View style={[styles.content, !isLast && { marginBottom: 20 }]}>
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
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dotActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  lineDone: {
    backgroundColor: Colors.success,
  },
  content: {
    flex: 1,
    paddingBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.inkTertiary,
    marginBottom: 2,
  },
  labelDone: {
    color: Colors.ink,
  },
  labelActive: {
    color: Colors.primary,
  },
  beschreibung: {
    fontSize: 13,
    color: Colors.inkSecondary,
    marginBottom: 3,
    lineHeight: 18,
  },
  zeitpunkt: {
    fontSize: 12,
    color: Colors.inkTertiary,
  },
  ausstehend: {
    fontStyle: 'italic',
  },
});
