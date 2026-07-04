import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import type { PaymentRow } from '../../db/schema';
import type { PaymentsRepository } from './payments.repository';
import { PaymentService } from './payment.service';

const WEBHOOK_SECRET = 'whsec_test_fake';

function makePaymentRow(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'payment-1',
    organizationId: DEFAULT_TENANT_CONTEXT.organizationId,
    onboardingSessionId: 'session-1',
    supplyId: null,
    stripePaymentIntentId: 'pi_123',
    amountCents: 1000,
    currency: 'eur',
    status: 'requires_payment_method',
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeService(overrides: { stripe?: Partial<Stripe>; payments?: Partial<PaymentsRepository> } = {}) {
  const stripe = {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    ...overrides.stripe,
  } as unknown as Stripe;
  const payments = {
    findReusableForSession: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    findByStripePaymentIntentId: jest.fn(),
    setStatus: jest.fn(),
    setSupplyId: jest.fn(),
    ...overrides.payments,
  } as unknown as PaymentsRepository;
  return { service: new PaymentService(stripe, payments), stripe, payments };
}

describe('PaymentService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createOrReuseIntent', () => {
    it('creates a new PaymentIntent and persists a payments row when none is reusable', async () => {
      const { service, stripe, payments } = makeService();
      (stripe.paymentIntents.create as jest.Mock).mockResolvedValue({ id: 'pi_new', client_secret: 'secret_new' });

      const result = await service.createOrReuseIntent(DEFAULT_TENANT_CONTEXT, 'session-1', 1000);

      expect(result).toEqual({ clientSecret: 'secret_new', paymentIntentId: 'pi_new', amountCents: 1000, currency: 'eur' });
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1000, currency: 'eur', metadata: { onboardingSessionId: 'session-1', organizationId: DEFAULT_TENANT_CONTEXT.organizationId } }),
      );
      expect(payments.create).toHaveBeenCalledWith(DEFAULT_TENANT_CONTEXT, {
        onboardingSessionId: 'session-1',
        stripePaymentIntentId: 'pi_new',
        amountCents: 1000,
        currency: 'eur',
      });
    });

    it('reuses an existing PaymentIntent instead of creating a second one for the same session', async () => {
      const existing = makePaymentRow({ stripePaymentIntentId: 'pi_existing', amountCents: 1000, currency: 'eur' });
      const { service, stripe, payments } = makeService({ payments: { findReusableForSession: jest.fn().mockResolvedValue(existing) } });
      (stripe.paymentIntents.retrieve as jest.Mock).mockResolvedValue({ id: 'pi_existing', client_secret: 'secret_existing' });

      const result = await service.createOrReuseIntent(DEFAULT_TENANT_CONTEXT, 'session-1', 1000);

      expect(result).toEqual({ clientSecret: 'secret_existing', paymentIntentId: 'pi_existing', amountCents: 1000, currency: 'eur' });
      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
      expect(payments.create).not.toHaveBeenCalled();
    });

    it('throws if Stripe returns no client_secret', async () => {
      const { service, stripe } = makeService();
      (stripe.paymentIntents.create as jest.Mock).mockResolvedValue({ id: 'pi_new', client_secret: null });

      await expect(service.createOrReuseIntent(DEFAULT_TENANT_CONTEXT, 'session-1', 1000)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('constructWebhookEvent', () => {
    it('verifies a genuine signature and returns the parsed event — pure local crypto, no network call', () => {
      // A real (non-mocked) Stripe client for this one test, since it's
      // exercising the actual HMAC verification logic, not something to stub.
      const realStripe = new Stripe('sk_test_unused_for_this_call');
      const realService = new PaymentService(realStripe, {} as PaymentsRepository);
      const payload = Buffer.from(JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded' }));
      const signature = Stripe.webhooks.generateTestHeaderString({ payload: payload.toString(), secret: WEBHOOK_SECRET });

      const event = realService.constructWebhookEvent(payload, signature, WEBHOOK_SECRET);

      expect(event.id).toBe('evt_1');
      expect(event.type).toBe('payment_intent.succeeded');
    });

    it('rejects a missing signature without touching Stripe at all', () => {
      const { service, stripe } = makeService();
      expect(() => service.constructWebhookEvent(Buffer.from('{}'), undefined, WEBHOOK_SECRET)).toThrow(BadRequestException);
      expect(stripe.webhooks.constructEvent).not.toHaveBeenCalled();
    });

    it('rejects a forged signature', () => {
      const realStripe = new Stripe('sk_test_unused_for_this_call');
      const realService = new PaymentService(realStripe, {} as PaymentsRepository);
      const payload = Buffer.from(JSON.stringify({ id: 'evt_1' }));
      const wrongSignature = Stripe.webhooks.generateTestHeaderString({ payload: payload.toString(), secret: 'whsec_wrong_secret' });

      expect(() => realService.constructWebhookEvent(payload, wrongSignature, WEBHOOK_SECRET)).toThrow(BadRequestException);
    });
  });

  describe('markSucceeded', () => {
    it('flips an unpaid payment to succeeded and reports it as newly-succeeded', async () => {
      const { service, payments } = makeService();
      const payment = makePaymentRow({ status: 'requires_payment_method' });

      const shouldComplete = await service.markSucceeded(payment);

      expect(shouldComplete).toBe(true);
      expect(payments.setStatus).toHaveBeenCalledWith(payment.id, 'succeeded');
    });

    it('is idempotent — an already-succeeded payment is left alone and reported as not-newly-succeeded', async () => {
      const { service, payments } = makeService();
      const payment = makePaymentRow({ status: 'succeeded' });

      const shouldComplete = await service.markSucceeded(payment);

      expect(shouldComplete).toBe(false);
      expect(payments.setStatus).not.toHaveBeenCalled();
    });
  });
});
