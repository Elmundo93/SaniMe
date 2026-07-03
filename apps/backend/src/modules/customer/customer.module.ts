import { Module } from '@nestjs/common';
import { OnboardingSessionsRepository } from '../onboarding/onboarding-sessions.repository';
import { OnboardingSessionClaimAdapter } from '../onboarding/ports/onboarding-session-claim.adapter';
import { AuthModule } from '../auth/auth.module';
import { ConsentsRepository } from '../consents/consents.repository';
import { InsurancePoliciesRepository } from '../health-data/insurance-policies.repository';
import { OcrResultsRepository } from '../health-data/ocr-results.repository';
import { SupplyOrderModule } from '../supply-order/supply-order.module';
import { CustomerAddressesRepository } from './customer-addresses.repository';
import { CustomersMatchController } from './controllers/customers-match.controller';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';
import { ONBOARDING_SESSION_CLAIM_PORT } from './ports/onboarding-session-claim.port';

// OnboardingSessionClaimAdapter and everything it depends on are "leaf"
// providers (only need DRIZZLE) registered directly here rather than via a
// Nest-module import of OnboardingModule/HealthDataModule/Consents module —
// Customer never depends on those as Nest modules, matching Layer 1's
// CUSTOMER_SESSION_SECRET_PORT dependency-inversion precedent exactly.
@Module({
  imports: [AuthModule, SupplyOrderModule],
  controllers: [CustomersMatchController],
  providers: [
    CustomersRepository,
    CustomerAddressesRepository,
    CustomersService,
    OnboardingSessionsRepository,
    ConsentsRepository,
    InsurancePoliciesRepository,
    OcrResultsRepository,
    { provide: ONBOARDING_SESSION_CLAIM_PORT, useClass: OnboardingSessionClaimAdapter },
  ],
  exports: [CustomersService],
})
export class CustomerModule {}
