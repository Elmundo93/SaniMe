import { Injectable } from '@nestjs/common';
import type { OnboardingSessionClaimPort } from '../../customer/ports/onboarding-session-claim.port';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { ConsentsRepository } from '../../consents/consents.repository';
import { InsurancePoliciesRepository } from '../../health-data/insurance-policies.repository';
import { OcrResultsRepository } from '../../health-data/ocr-results.repository';
import { OnboardingSessionsRepository } from '../onboarding-sessions.repository';

// The real OnboardingSessionClaimPort implementation — registered directly
// in CustomerModule via `useClass` (see customer.module.ts), same
// leaf-provider pattern as CustomerSessionSecretAdapter, avoiding a
// circular Nest-module dependency between Customer and Onboarding.
//
// Layer 4: the single choke point that backfills customerId onto every
// subject-scoped health/compliance table once a session is identified —
// before this, InsurancePoliciesRepository.claimToCustomer existed but was
// never called from anywhere in production, and ConsentsRepository/
// OcrResultsRepository had no equivalent at all.
@Injectable()
export class OnboardingSessionClaimAdapter implements OnboardingSessionClaimPort {
  constructor(
    private readonly sessions: OnboardingSessionsRepository,
    private readonly consents: ConsentsRepository,
    private readonly insurancePolicies: InsurancePoliciesRepository,
    private readonly ocrResults: OcrResultsRepository,
  ) {}

  async claimSession(sessionId: string, customerId: string): Promise<void> {
    await this.sessions.claimToCustomer(DEFAULT_TENANT_CONTEXT, sessionId, customerId);
    await this.consents.claimToCustomer(DEFAULT_TENANT_CONTEXT, 'onboarding_session', sessionId, customerId);
    await this.insurancePolicies.claimToCustomer(DEFAULT_TENANT_CONTEXT, 'onboarding_session', sessionId, customerId);
    await this.ocrResults.claimToCustomer(DEFAULT_TENANT_CONTEXT, 'onboarding_session', sessionId, customerId);
  }
}
