import { Injectable } from '@nestjs/common';
import type { OnboardingSessionClaimPort } from '../../customer/ports/onboarding-session-claim.port';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { OnboardingSessionsRepository } from '../onboarding-sessions.repository';

// The real OnboardingSessionClaimPort implementation — registered directly
// in CustomerModule via `useClass` (see customer.module.ts), same
// leaf-provider pattern as CustomerSessionSecretAdapter, avoiding a
// circular Nest-module dependency between Customer and Onboarding.
@Injectable()
export class OnboardingSessionClaimAdapter implements OnboardingSessionClaimPort {
  constructor(private readonly sessions: OnboardingSessionsRepository) {}

  async claimSession(sessionId: string, customerId: string): Promise<void> {
    await this.sessions.claimToCustomer(DEFAULT_TENANT_CONTEXT, sessionId, customerId);
  }
}
