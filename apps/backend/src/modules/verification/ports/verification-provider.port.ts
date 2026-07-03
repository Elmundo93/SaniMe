export const VERIFICATION_PROVIDER = Symbol('VERIFICATION_PROVIDER');

export interface SendCodeResult {
  // Only ever populated outside production (dev/QA echo) — never rely on
  // this in a real delivery path. See dev-code-verification.provider.ts.
  devCode?: string;
}

// One concrete implementation now (DevCodeVerificationProvider), swappable
// for Layer 3's real SMS/Email-backed NotificationProvider without touching
// callers (Principle 7).
export interface VerificationProvider {
  sendCode(target: string, purpose: string): Promise<SendCodeResult>;
  verifyCode(target: string, purpose: string, code: string): Promise<boolean>;
}
