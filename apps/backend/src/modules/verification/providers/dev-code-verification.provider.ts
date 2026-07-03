import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import type { SendCodeResult, VerificationProvider } from '../ports/verification-provider.port';
import { VerificationCodesRepository } from '../verification-codes.repository';

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// A 6-digit code is only ~1M possibilities — bcrypt's slow-hashing defense
// is irrelevant when the search space itself is small. An HMAC keyed with a
// server-only pepper (never persisted) is what actually stops an offline
// brute-force of a leaked DB; combined with expiry + attempt-limiting, this
// closes both the offline and online guessing paths. This is what makes it
// "real" and distinct from today's 100%-fake client mock
// (hooks/useOtpVerification.ts's `code.length >= 6` accepts any string).
@Injectable()
export class DevCodeVerificationProvider implements VerificationProvider {
  private readonly logger = new Logger(DevCodeVerificationProvider.name);

  constructor(
    private readonly codes: VerificationCodesRepository,
    private readonly config: ConfigService,
  ) {}

  async sendCode(target: string, purpose: string): Promise<SendCodeResult> {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      // Deliberate guardrail: fails loudly rather than silently "succeeding"
      // so this stub can never accidentally ship as a real verification
      // path — Layer 3's real NotificationProvider-backed implementation
      // must be wired in before go-live.
      throw new NotImplementedException('Kein produktiver Verification-Provider konfiguriert');
    }

    const code = randomInt(100000, 1000000).toString();
    const codeHmac = this.hmac(code);
    await this.codes.create(target, purpose, codeHmac, new Date(Date.now() + CODE_EXPIRY_MS));

    // Dev/QA only — never sent to analytics, matches the "no health/PII in
    // analytics" rule (health data isn't involved here, but the discipline is).
    this.logger.log(`[dev] Verification code for ${purpose}/${target}: ${code}`);
    return { devCode: code };
  }

  async verifyCode(target: string, purpose: string, code: string): Promise<boolean> {
    const active = await this.codes.findLatestActive(target, purpose);
    if (!active) {
      return false;
    }
    if (active.attempts >= MAX_ATTEMPTS) {
      await this.codes.consume(active.id);
      return false;
    }

    await this.codes.incrementAttempts(active.id);

    const suppliedHmac = Buffer.from(this.hmac(code));
    const storedHmac = Buffer.from(active.codeHmac);
    const matches = suppliedHmac.length === storedHmac.length && timingSafeEqual(suppliedHmac, storedHmac);
    if (matches) {
      await this.codes.consume(active.id);
    }
    return matches;
  }

  private hmac(code: string): string {
    const pepper = this.config.getOrThrow<string>('VERIFICATION_CODE_PEPPER');
    return createHmac('sha256', pepper).update(code).digest('hex');
  }
}
