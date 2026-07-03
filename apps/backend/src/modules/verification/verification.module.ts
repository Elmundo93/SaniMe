import { Module } from '@nestjs/common';
import { VerificationCleanupJobHandler } from './jobs/verification-cleanup.job-handler';
import { VERIFICATION_PROVIDER } from './ports/verification-provider.port';
import { DevCodeVerificationProvider } from './providers/dev-code-verification.provider';
import { VerificationCodesRepository } from './verification-codes.repository';

@Module({
  providers: [
    VerificationCodesRepository,
    VerificationCleanupJobHandler,
    { provide: VERIFICATION_PROVIDER, useClass: DevCodeVerificationProvider },
  ],
  exports: [VERIFICATION_PROVIDER],
})
export class VerificationModule {}
