import type { ClientOnboardingEvent, OnboardingSession } from '@sanime/domain';
import { request } from './client';

export interface ProposedSlot {
  supplierId: string;
  productId: string;
  start: string;
  end: string;
}

export function create(): Promise<{ sessionId: string; sessionSecret: string }> {
  return request('POST', '/onboarding-sessions', { auth: false });
}

export function getCurrent(): Promise<OnboardingSession> {
  return request('GET', '/onboarding-sessions/current');
}

export function patch(
  sessionId: string,
  event: ClientOnboardingEvent,
  code?: string,
): Promise<{ session: OnboardingSession; devCode?: string }> {
  return request('PATCH', `/onboarding-sessions/${sessionId}`, { body: { event, code }, idempotent: true });
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
