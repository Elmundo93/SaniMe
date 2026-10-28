import { HttpException, HttpStatus } from '@nestjs/common';
import { CODE_ERNEUT_SENDEN_SEKUNDEN } from '@sanime/domain';
import type { VerificationCodesRepository } from './verification-codes.repository';

// SMS kosten Geld und laden zum Missbrauch ein (SMS-Pumping): höchstens drei
// Codes je Nummer und Stunde, frühestens alle 30 Sekunden — für jeden
// Versandweg (eigene SMS wie Telekom Verify).
const MAX_CODES_PRO_STUNDE = 3;

export async function pruefeSendegrenzen(codes: VerificationCodesRepository, target: string, purpose: string) {
  const letzte = await codes.listCreatedSince(target, purpose, new Date(Date.now() - 60 * 60 * 1000));
  if (letzte.length >= MAX_CODES_PRO_STUNDE) {
    throw new HttpException('Du hast schon mehrere Codes angefordert. Bitte versuche es in einer Stunde erneut.', HttpStatus.TOO_MANY_REQUESTS);
  }
  const juengster = letzte[0]?.createdAt;
  const warten = juengster ? Math.ceil(CODE_ERNEUT_SENDEN_SEKUNDEN - (Date.now() - juengster.getTime()) / 1000) : 0;
  if (warten > 0) {
    throw new HttpException(`Bitte warte noch ${warten} Sekunden, bevor du einen neuen Code anforderst.`, HttpStatus.TOO_MANY_REQUESTS);
  }
}
