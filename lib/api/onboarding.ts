import type { ClientOnboardingEvent, OnboardingSession } from '@sanime/domain';
import { request } from './client';

export interface ProposedSlot {
  supplierId: string;
  productId: string;
  start: string;
  end: string;
}

// Mit dem Secret der bisherigen Sitzung (falls vorhanden): war sie schon einem
// Kunden zugeordnet, bleibt er in der neuen Bestellung bekannt und sieht seine
// Versorgungen weiter. Nach dem Abmelden gibt es kein Secret mehr.
export function create(): Promise<{ sessionId: string; sessionSecret: string }> {
  return request('POST', '/onboarding-sessions');
}

export function getCurrent(): Promise<OnboardingSession> {
  return request('GET', '/onboarding-sessions/current');
}

export function patch(
  sessionId: string,
  event: ClientOnboardingEvent,
  code?: string,
): Promise<{ session: OnboardingSession; devCode?: string; checkUrl?: string; einwilligungsToken?: string }> {
  return request('PATCH', `/onboarding-sessions/${sessionId}`, { body: { event, code }, idempotent: true });
}

// Widerruf der dauerhaften Einwilligung — der Token ist der Besitznachweis,
// daher ohne Bearer. Antwortet immer 204, auch für unbekannte Tokens.
export function einwilligungWiderrufen(einwilligungsToken: string): Promise<void> {
  return request('POST', '/consent-grants/revoke', { body: { einwilligungsToken }, auth: false });
}

// Reicht eine Versorgung ohne Checkout-Zahlung ein — nur für Rezept-
// Versorgungen; zahlungspflichtige Selbstzahler-Käufe lehnt der Server ab.
export function complete(sessionId: string): Promise<{ supplyId: string }> {
  return request('POST', `/onboarding-sessions/${sessionId}/complete`, { idempotent: true });
}

export function getAppointmentSlots(sessionId: string): Promise<ProposedSlot[]> {
  return request('GET', `/onboarding-sessions/${sessionId}/appointment-slots`);
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
}

// The amount is computed server-side from the session's selected product —
// nothing here ever sends an amount to the backend. Completion itself
// (creating the real Supply/Order, flipping status to ABGESCHLOSSEN) is
// driven by the backend's Stripe webhook, never by this call succeeding —
// see checkout.tsx's post-PaymentSheet polling.
export function createPaymentIntent(sessionId: string): Promise<PaymentIntentResult> {
  return request('POST', `/onboarding-sessions/${sessionId}/payment-intent`, { idempotent: true });
}

// Nur __DEV__ ohne konfigurierten Stripe-Publishable-Key: das Backend simuliert
// den Stripe-Webhook (Route existiert nur bei NODE_ENV=development). Der
// Abschluss passiert trotzdem serverseitig — checkout.tsx pollt danach genauso.
export function devZahlungSimulieren(sessionId: string): Promise<{ supplyId: string }> {
  return request('POST', `/onboarding-sessions/${sessionId}/dev-zahlung`);
}

// Stille Prüfung gescheitert (z. B. im WLAN) — sofort per SMS weiter.
export function smsStattNetzpruefung(sessionId: string): Promise<void> {
  return request('POST', `/onboarding-sessions/${sessionId}/sms-statt-netzpruefung`);
}
