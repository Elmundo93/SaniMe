import type { OnboardingStatus } from '@sanime/domain';

// Geschlossene Union ohne Escape-Hatch: es gibt keinen Payload-Slot für OCR-Werte, Namen,
// Diagnosen oder Versichertennummern — Gesundheitsdaten lassen sich hier gar nicht erst
// abbilden (stärker als eine nachträgliche Laufzeit-Filterung).
export type OnboardingAnalyticsEvent =
  | { name: 'screen_opened'; status: OnboardingStatus }
  | { name: 'ocr_success'; feld: 'rezept' | 'krankenkasse' }
  | { name: 'ocr_corrected' }
  | { name: 'supply_chosen'; produktKategorie: string }
  | { name: 'appointment_chosen' }
  | { name: 'checkout_started' }
  | { name: 'checkout_completed' }
  | { name: 'onboarding_completed'; dauerSekunden: number };

export function trackOnboarding(event: OnboardingAnalyticsEvent) {
  if (__DEV__) {
    console.log('[analytics]', event.name, event);
    return;
  }
  // In Produktion: an Analytics-Backend senden (anonymisiert, keine Gesundheitsdaten)
}
