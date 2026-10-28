export const VERIFICATION_PROVIDER = Symbol('VERIFICATION_PROVIDER');

export interface SendCodeResult {
  // Only populated when no real SMS goes out (dev/QA echo) — never with a
  // real sender. See sms-code-verification.provider.ts.
  devCode?: string;
}

// SmsCodeVerificationProvider: codes, limits and checks here; delivery behind
// SMS_SENDER. A later network-based check (Silent Network Auth) is a
// separate path in front of this one, not a replacement.
export interface VerificationProvider {
  sendCode(target: string, purpose: string): Promise<SendCodeResult>;
  verifyCode(target: string, purpose: string, code: string): Promise<boolean>;
}
