import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOnboardingStore, STATUS_META } from '../store/onboardingStore';
import type { OnboardingStatus } from '../types';

// Jeder Onboarding-/Scan-Screen ruft dies mit seinem eigenen Status auf. Stimmt der
// tatsächliche Session-Status nicht überein (Deep-Link, Zurück-Wischen, Absturz-Resume,
// Dev-Reload), wird strukturell auf den richtigen Screen umgeleitet statt sich auf
// Einzelfall-Guards pro Screen zu verlassen.
export function useOnboardingGuard(expected: OnboardingStatus | OnboardingStatus[]) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session?.status]);

  return { session, ready: !isLoading && !!session && erlaubt.includes(session.status) };
}
