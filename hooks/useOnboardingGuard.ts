import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOnboardingStore, STATUS_META } from '../store/onboardingStore';
import type { OnboardingSession, OnboardingStatus } from '../types';

export interface OnboardingGuardOptions {
  // Für Screens, die z.B. session.ocrResult! ohne erneute Prüfung lesen: hier
  // deklarieren, welche Felder wirklich vorhanden sein müssen. Fehlt eines (korrupte/
  // teilweise geschriebene Session, manuelle Storage-Bearbeitung, künftiger Bug in
  // applyEventData), bleibt `ready` false statt dass der Screen mit einem `!`-Zugriff
  // auf null crasht — der Nutzer wird stattdessen zum Schritt zurückgeschickt, der
  // das fehlende Feld füllt.
  requireOcrResult?: boolean;
  requireSupply?: boolean;
  requireAppointment?: boolean;
}

function fehlendesPflichtfeldRoute(session: OnboardingSession, options?: OnboardingGuardOptions): string | null {
  if (options?.requireOcrResult && !session.ocrResult) return STATUS_META.REZEPT_AUFNAHME.route;
  if (options?.requireSupply && !session.selectedSupply) return STATUS_META.VERSORGUNGSAUSWAHL.route;
  if (options?.requireAppointment && !session.selectedAppointment) return STATUS_META.TERMINPLANUNG.route;
  return null;
}

// Jeder Onboarding-/Scan-Screen ruft dies mit seinem eigenen Status auf. Stimmt der
// tatsächliche Session-Status nicht überein (Deep-Link, Zurück-Wischen, Absturz-Resume,
// Dev-Reload), wird strukturell auf den richtigen Screen umgeleitet statt sich auf
// Einzelfall-Guards pro Screen zu verlassen.
export function useOnboardingGuard(
  expected: OnboardingStatus | OnboardingStatus[],
  options?: OnboardingGuardOptions,
) {
  const session = useOnboardingStore((s) => s.session);
  const isLoading = useOnboardingStore((s) => s.isLoading);
  const router = useRouter();
  const erlaubt = Array.isArray(expected) ? expected : [expected];

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/onboarding');
      return;
    }
    if (!erlaubt.includes(session.status)) {
      router.replace(STATUS_META[session.status].route as any);
      return;
    }
    const fehlendeRoute = fehlendesPflichtfeldRoute(session, options);
    if (fehlendeRoute) {
      router.replace(fehlendeRoute as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session?.status, session?.ocrResult, session?.selectedSupply, session?.selectedAppointment]);

  const pflichtfelderVorhanden = !session || !fehlendesPflichtfeldRoute(session, options);

  return {
    session,
    ready: !isLoading && !!session && erlaubt.includes(session.status) && pflichtfelderVorhanden,
  };
}
