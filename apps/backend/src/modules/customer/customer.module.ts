import { Module } from '@nestjs/common';
import { OnboardingSessionsRepository } from '../onboarding/onboarding-sessions.repository';
import { OnboardingSessionClaimAdapter } from '../onboarding/ports/onboarding-session-claim.adapter';
import { AuthModule } from '../auth/auth.module';
import { SupplyOrderModule } from '../supply-order/supply-order.module';
import { CustomerAddressesRepository } from './customer-addresses.repository';
import { CustomersMatchController } from './controllers/customers-match.controller';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';
import { ONBOARDING_SESSION_CLAIM_PORT } from './ports/onboarding-session-claim.port';

// OnboardingSessionClaimAdapter + OnboardingSessionsRepository are "leaf"
// providers (only need DRIZZLE) registered directly here rather than via a
// Nest-module import of OnboardingModule — Customer never depends on
// Onboarding as a Nest module, matching Layer 1's CUSTOMER_SESSION_SECRET_PORT
// dependency-inversion precedent exactly.
@Module({
  imports: [AuthModule, SupplyOrderModule],
  controllers: [CustomersMatchController],
  providers: [
    CustomersRepository,
    CustomerAddressesRepository,
    CustomersService,
    OnboardingSessionsRepository,
    { provide: ONBOARDING_SESSION_CLAIM_PORT, useClass: OnboardingSessionClaimAdapter },
  ],
  exports: [CustomersService],
})
export class CustomerModule {}
