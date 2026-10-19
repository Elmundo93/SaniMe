import React from 'react';
import type { OnboardingSession } from '@sanime/domain';
import { schrittInfo } from '../../store/onboardingStore';
import { StepCounter } from './StepCounter';

// Schrittanzeige im Header der Rezept-Scan-Screens — die Zählung hängt davon
// ab, ob der Scan der Weg in die Bestellung ist oder ein Rezept für eine
// Position nachpflegt (siehe schrittInfo).
export function ScanSchrittZaehler({ session }: { session: OnboardingSession }) {
  const schritt = schrittInfo(session);
  if (!schritt) return null;
  return (
    <StepCounter
      aktuellerSchritt={schritt.aktuell}
      gesamtSchritte={schritt.gesamt}
      variant="light"
      label={`${schritt.aktuell}/${schritt.gesamt}`}
    />
  );
}
