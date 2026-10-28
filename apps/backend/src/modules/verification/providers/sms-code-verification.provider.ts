import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { SMS_SENDER, type SmsSender } from '../ports/sms-sender.port';
import type { SendCodeResult, VerificationProvider } from '../ports/verification-provider.port';
import { pruefeSendegrenzen } from '../sendegrenzen';
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
// Der Versand selbst steckt hinter SMS_SENDER (seven.io oder Dev). Nur ohne
// echten Versand steht der Code in der Antwort (devCode) — mit echtem
// Versand nie, sonst wäre die Bestätigung wertlos.
@Injectable()
export class SmsCodeVerificationProvider implements VerificationProvider {
  constructor(
    private readonly codes: VerificationCodesRepository,
    private readonly config: ConfigService,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
  ) {}

  async sendCode(target: string, purpose: string): Promise<SendCodeResult> {
    await pruefeSendegrenzen(this.codes, target, purpose);

    const code = randomInt(100000, 1000000).toString();
    const codeHmac = this.hmac(code);
    await this.codes.create(target, purpose, codeHmac, new Date(Date.now() + CODE_EXPIRY_MS));

    // iOS/Android erkennen den Code und schlagen ihn über der Tastatur vor.
    // (Die domaingebundene Zeile „@sanime.de #123456“ erst, wenn die App per
    // Associated Domains mit sanime.de verknüpft ist — vorher würde iOS den
    // Code gar nicht mehr anbieten.)
    await this.sms.send(target, `${code} ist dein SaniMe-Bestätigungscode. Er gilt 10 Minuten.`);

    return this.sms.echterVersand ? {} : { devCode: code };
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
