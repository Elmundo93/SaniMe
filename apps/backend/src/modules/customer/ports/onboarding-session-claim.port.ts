export const ONBOARDING_SESSION_CLAIM_PORT = Symbol('ONBOARDING_SESSION_CLAIM_PORT');

// Customer must never import Onboarding directly (Onboarding is built last
// and depends on nearly everything else) — mirrors the exact
// CUSTOMER_SESSION_SECRET_PORT dependency-inversion pattern from Layer 1.
// Onboarding's module registers the real provider for this token; the
// /customers/match controller (built in Phase 2.6, once Supply/Order also
// exists) is the consumer.
export interface OnboardingSessionClaimPort {
  claimSession(sessionId: string, customerId: string): Promise<void>;
}
