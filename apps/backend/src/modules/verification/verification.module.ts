import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationCleanupJobHandler } from './jobs/verification-cleanup.job-handler';
import { SMS_SENDER } from './ports/sms-sender.port';
import { VERIFICATION_PROVIDER } from './ports/verification-provider.port';
import { DevSmsSender } from './providers/dev-sms.sender';
import { SevenSmsSender } from './providers/seven-sms.sender';
import { SmsCodeVerificationProvider } from './providers/sms-code-verification.provider';
import { TelekomVerifyClient, telekomVerifyKonfigurationAusEnv } from './providers/telekom-verify.client';
import { TelekomVerificationProvider } from './providers/telekom-verification.provider';
import { VerificationCodesRepository } from './verification-codes.repository';

@Module({
  providers: [
    VerificationCodesRepository,
    VerificationCleanupJobHandler,
    DevSmsSender,
    {
      // Opt-in wie Stripe/APNs: mit SEVEN_API_KEY echte SMS, sonst Dev-Versand.
      provide: SMS_SENDER,
      inject: [ConfigService, DevSmsSender],
      useFactory: (config: ConfigService, dev: DevSmsSender) => {
        const apiKey = config.get<string>('SEVEN_API_KEY');
        return apiKey ? new SevenSmsSender(apiKey, config.get<string>('SMS_ABSENDER') ?? 'SaniMe') : dev;
      },
    },
    SmsCodeVerificationProvider,
    {
      // Telekom Verify (stille Prüfung + SMS) hat Vorrang, sobald die
      // Application konfiguriert ist; sonst eigener Code mit SMS_SENDER.
      provide: VERIFICATION_PROVIDER,
      inject: [ConfigService, VerificationCodesRepository, SmsCodeVerificationProvider],
      useFactory: (config: ConfigService, codes: VerificationCodesRepository, eigene: SmsCodeVerificationProvider) => {
        const telekom = telekomVerifyKonfigurationAusEnv((name) => config.get<string>(name));
        return telekom ? new TelekomVerificationProvider(codes, new TelekomVerifyClient(telekom)) : eigene;
      },
    },
  ],
  exports: [VERIFICATION_PROVIDER],
})
export class VerificationModule {}
