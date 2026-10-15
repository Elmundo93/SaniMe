import { Module } from '@nestjs/common';
import { AppointmentModule } from '../appointment/appointment.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { HealthDataModule } from '../health-data/health-data.module';
import { PaymentModule } from '../payment/payment.module';
import { SupplyOrderModule } from '../supply-order/supply-order.module';
import { VerificationModule } from '../verification/verification.module';
import { ConsentsRepository } from '../consents/consents.repository';
import { OnboardingController } from './controllers/onboarding.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { OnboardingSessionsRepository } from './onboarding-sessions.repository';
import { OnboardingService } from './onboarding.service';

@Module({
  // AppointmentModule/PaymentModule never import OnboardingModule (verified)
  // — one-directional, no cycle. PaymentModule is needed both for the
  // customer-facing payment-intent endpoint (OnboardingController) and the
  // Stripe webhook (StripeWebhookController) — the webhook itself lives here,
  // not in PaymentModule, specifically so PaymentModule never needs to import
  // OnboardingService back (it would otherwise, to call abschliessenNachZahlung()).
  imports: [AppointmentModule, AuthModule, CatalogModule, HealthDataModule, PaymentModule, SupplyOrderModule, VerificationModule],
  controllers: [OnboardingController, StripeWebhookController],
  providers: [OnboardingSessionsRepository, ConsentsRepository, OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
