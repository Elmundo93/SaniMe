import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type Stripe from 'stripe';
import type { TenantContext } from '../../common/repository/tenant-context';
import type { PaymentRow } from '../../db/schema';
import { PaymentsRepository } from './payments.repository';
import { STRIPE_CLIENT } from './stripe-client.token';

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
}

// No port/adapter interface here (unlike StorageProvider/NotificationProvider)
// — there's no planned second payment provider to swap in, Stripe itself is
// already the abstraction boundary. The Stripe client is still injected via
// STRIPE_CLIENT (a factory provider, see payment.module.ts) rather than
// `new Stripe(...)` inline, purely so tests can substitute a mock without a
// real API key or network access.
@Injectable()
export class PaymentService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly payments: PaymentsRepository,
  ) {}

  // Reuses an existing PaymentIntent if one's still in a confirmable state
  // for this session (e.g. the customer backgrounded the app mid-PaymentSheet
  // and reopened it) — never creates a second live intent for the same
  // checkout, which would let a customer be charged twice for one order.
  async createOrReuseIntent(tenant: TenantContext, onboardingSessionId: string, amountCents: number, currency = 'eur'): Promise<PaymentIntentResult> {
    const existing = await this.payments.findReusableForSession(tenant, onboardingSessionId);
    if (existing) {
      const intent = await this.stripe.paymentIntents.retrieve(existing.stripePaymentIntentId);
      if (!intent.client_secret) {
        throw new InternalServerErrorException('Stripe hat keinen client_secret für eine bestehende Zahlung zurückgegeben');
      }
      return { clientSecret: intent.client_secret, paymentIntentId: intent.id, amountCents: existing.amountCents, currency: existing.currency };
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      // Lets Stripe's Dashboard config decide which methods actually appear
      // (card always; Apple/Google Pay only once the app is configured for
      // them) — safe to enable unconditionally, this alone doesn't turn
      // wallets on for a client that hasn't set up merchant capability.
      automatic_payment_methods: { enabled: true },
      metadata: { onboardingSessionId, organizationId: tenant.organizationId },
    });
    if (!intent.client_secret) {
      throw new InternalServerErrorException('Stripe hat keinen client_secret zurückgegeben');
    }
    await this.payments.create(tenant, { onboardingSessionId, stripePaymentIntentId: intent.id, amountCents, currency });
    return { clientSecret: intent.client_secret, paymentIntentId: intent.id, amountCents, currency };
  }

  // Pure local HMAC verification against STRIPE_WEBHOOK_SECRET — no network
  // call to Stripe, so this (and the tests exercising it) work without any
  // real Stripe credentials. Throws on a bad/missing signature; the caller
  // (StripeWebhookController) turns that into a 400.
  constructWebhookEvent(rawBody: Buffer, signature: string | string[] | undefined, webhookSecret: string): Stripe.Event {
    if (!signature) {
      throw new BadRequestException('Fehlende Stripe-Signatur');
    }
    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Ungültige Stripe-Signatur: ${err instanceof Error ? err.message : 'unbekannter Fehler'}`);
    }
  }

  findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<PaymentRow | null> {
    return this.payments.findByStripePaymentIntentId(stripePaymentIntentId);
  }

  // Idempotent by construction: returns false (do nothing further) if this
  // payment was already marked succeeded by an earlier delivery of the same
  // webhook event — Stripe retries webhooks at-least-once, and the caller
  // (StripeWebhookController) must only call OnboardingService.abschliessenNachZahlung()
  // once per payment, or the second call hits an illegal FSM transition.
  async markSucceeded(payment: PaymentRow): Promise<boolean> {
    if (payment.status === 'succeeded') return false;
    await this.payments.setStatus(payment.id, 'succeeded');
    return true;
  }

  async markFailed(payment: PaymentRow, reason: string | null): Promise<void> {
    await this.payments.setStatus(payment.id, 'failed', reason);
  }

  async attachSupply(payment: PaymentRow, supplyId: string): Promise<void> {
    await this.payments.setSupplyId(payment.id, supplyId);
  }
}
