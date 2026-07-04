import type { OnboardingEvent, OnboardingSession } from '@sanime/domain';
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
  event: OnboardingEvent,
  code?: string,
): Promise<{ session: OnboardingSession; devCode?: string }> {
  return request('PATCH', `/onboarding-sessions/${sessionId}`, { body: { event, code }, idempotent: true });
}

export function complete(sessionId: string): Promise<{ supplyId: string }> {
  return request('POST', `/onboarding-sessions/${sessionId}/complete`, { idempotent: true });
}

export function getAppointmentSlots(sessionId: string): Promise<ProposedSlot[]> {
  return request('GET', `/onboarding-sessions/${sessionId}/appointment-slots`);
}
