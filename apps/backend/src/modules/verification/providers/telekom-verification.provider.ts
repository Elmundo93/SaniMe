import { BadRequestException } from '@nestjs/common';
import type { SendCodeResult, VerificationProvider } from '../ports/verification-provider.port';
import { pruefeSendegrenzen } from '../sendegrenzen';
import type { VerificationCodesRepository } from '../verification-codes.repository';
import type { TelekomVerifyClient } from './telekom-verify.client';

// Eine Telekom-Prüfung läuft bis zu ~5 Minuten (stille Prüfung + SMS); danach
// muss ein neuer Code her.
const GUELTIG_MS = 10 * 60 * 1000;

// Telefonbestätigung über Telekom Verify: erst still über das Mobilfunknetz
// (falls freigegeben), sonst per SMS — beides endet in einem Code, den die App
// wie gewohnt mit OTP_VERIFIZIERT einreicht. Sendegrenzen gelten wie beim
// eigenen SMS-Versand.
export class TelekomVerificationProvider implements VerificationProvider {
  constructor(
    private readonly codes: VerificationCodesRepository,
    private readonly telekom: TelekomVerifyClient,
  ) {}

  async sendCode(target: string, purpose: string): Promise<SendCodeResult> {
    await pruefeSendegrenzen(this.codes, target, purpose);
    const { requestId, checkUrl } = await this.telekom.start(target);
    await this.codes.create(target, purpose, '', new Date(Date.now() + GUELTIG_MS), requestId);
    return checkUrl ? { checkUrl } : {};
  }

  async verifyCode(target: string, purpose: string, code: string): Promise<boolean> {
    const active = await this.codes.findLatestActive(target, purpose);
    if (!active?.providerRequestId) return false;
    const ok = await this.telekom.pruefe(active.providerRequestId, code);
    if (ok) await this.codes.consume(active.id);
    return ok;
  }

  async smsStattStillerPruefung(target: string, purpose: string): Promise<void> {
    const active = await this.codes.findLatestActive(target, purpose);
    if (!active?.providerRequestId) throw new BadRequestException('Es läuft keine Bestätigung — bitte fordere einen neuen Code an.');
    await this.telekom.naechsterKanal(active.providerRequestId);
  }
}
