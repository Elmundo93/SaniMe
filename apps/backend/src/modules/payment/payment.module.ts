import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsRepository } from './payments.repository';
import { PaymentService } from './payment.service';
import { STRIPE_CLIENT } from './stripe-client.token';

@Module({
  imports: [ConfigModule],
  providers: [
    PaymentsRepository,
    PaymentService,
    {
      provide: STRIPE_CLIENT,
      // Factory, not `new Stripe(...)` at PaymentService's own construction
      // site, purely so tests can override this one provider with a mock —
      // PaymentService itself never imports the `stripe` package directly.
      // STRIPE_SECRET_KEY is optional at boot (see env.schema.ts), but
      // Stripe's own constructor throws immediately ("Neither apiKey nor
      // config.authenticator provided") on an empty string — a real crash
      // caught by booting this module without a key configured, not a
      // hypothetical. A syntactically-a-string-but-obviously-fake fallback
      // lets construction succeed either way; an actual API call with it
      // fails with Stripe's own real authentication error at the moment
      // someone actually tries to use the feature, which is the "fail
      // loudly, only when it matters" behavior this was meant to have.
      useFactory: (config: ConfigService) => new Stripe(config.get<string>('STRIPE_SECRET_KEY') || 'sk_test_not_configured'),
      inject: [ConfigService],
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
