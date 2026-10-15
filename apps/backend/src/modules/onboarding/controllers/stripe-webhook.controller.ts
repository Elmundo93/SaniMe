import { BadRequestException, Controller, Headers, HttpCode, Logger, Post, RawBody } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { PaymentService } from '../../payment/payment.service';
import { OnboardingService } from '../onboarding.service';

// No CustomerSessionAuthGuard / AnyPrincipalAuthGuard here — Stripe is not a
// customer or admin principal and can't authenticate as one. The Stripe
// signature (verified against STRIPE_WEBHOOK_SECRET, never against anything
// client-controlled) is the entire trust boundary for this route. This is
// also why it lives in OnboardingModule rather than PaymentModule: it needs
// OnboardingService.abschliessenNachZahlung(), and PaymentModule must never import
// OnboardingModule back (see onboarding.module.ts's comment).
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly payment: PaymentService,
    private readonly onboarding: OnboardingService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(@RawBody() rawBody: Buffer, @Headers('stripe-signature') signature: string | undefined) {
    if (!rawBody) {
      // Only happens if NestFactory wasn't booted with `rawBody: true` — a
      // config regression, not a client error, but still a 400 rather than
      // a 500 crash since there's nothing this request itself can do about it.
      throw new BadRequestException('Roher Request-Body nicht verfügbar — rawBody muss in main.ts aktiviert sein');
    }
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET ist nicht konfiguriert');
    }
    const event = this.payment.constructWebhookEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handleSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handleFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        // Stripe sends many event types this integration doesn't act on
        // (e.g. charge.*, payment_method.*) — a 200 ack for anything
        // unhandled is correct per Stripe's own webhook docs, not a bug.
        break;
    }
    return { received: true };
  }

  private async handleSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.payment.findByStripePaymentIntentId(intent.id);
    if (!payment) {
      this.logger.warn(`payment_intent.succeeded für unbekannte Zahlung "${intent.id}"`);
      return;
    }
    const shouldComplete = await this.payment.markSucceeded(payment);
    if (!shouldComplete) return; // already processed by an earlier delivery of this event

    try {
      const { supplyId } = await this.onboarding.abschliessenNachZahlung(DEFAULT_TENANT_CONTEXT, payment.onboardingSessionId);
      await this.payment.attachSupply(payment, supplyId);
    } catch (err) {
      // The session may already be ABGESCHLOSSEN (e.g. a race with a
      // near-simultaneous retry) — log and swallow rather than making Stripe
      // retry a webhook that can never succeed differently. A genuinely
      // stuck session here is a real-world edge case for an admin to
      // investigate, not something retrying this handler can fix.
      this.logger.error(`OnboardingService.abschliessenNachZahlung() nach Zahlung "${intent.id}" fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async handleFailed(intent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.payment.findByStripePaymentIntentId(intent.id);
    if (!payment) {
      this.logger.warn(`payment_intent.payment_failed für unbekannte Zahlung "${intent.id}"`);
      return;
    }
    const reason = intent.last_payment_error?.message ?? 'Unbekannter Fehler';
    await this.payment.markFailed(payment, reason);
    await this.onboarding.markPaymentFailed(DEFAULT_TENANT_CONTEXT, payment.onboardingSessionId);
  }
}
