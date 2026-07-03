export interface CustomerSessionLookup {
  sessionId: string;
  customerId: string | null;
}

// Layer 1 defines the port; Layer 2's Onboarding module provides the real
// implementation backed by `onboarding_sessions` (opaque server secret ->
// session, claimed to a real customer after OTP/archive-match). No provider
// is registered for this token in Layer 1 — see CustomerSessionStrategy.
export const CUSTOMER_SESSION_SECRET_PORT = Symbol('CUSTOMER_SESSION_SECRET_PORT');

export interface CustomerSessionSecretPort {
  resolveSecret(secret: string): Promise<CustomerSessionLookup | null>;
}
