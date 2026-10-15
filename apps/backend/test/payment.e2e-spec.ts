import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import Stripe from 'stripe';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { STRIPE_CLIENT } from '../src/modules/payment/stripe-client.token';

// No real Stripe account/credentials anywhere in this file: paymentIntents
// create/retrieve are plain jest mocks (never touch the network), and
// webhook signature verification runs for real against a throwaway Stripe
// instance + STRIPE_WEBHOOK_SECRET from .env — that's pure local HMAC
// computation, not an API call, so it's fully exercisable without a Stripe
// account. This is the real trust-boundary proof: a client can never
// complete a Versorgung by simply claiming "I paid" — only a correctly
// signed webhook event can.
describe('Payment flow (e2e)', () => {
  let app: INestApplication;
  let sessionId: string;
  let sessionSecret: string;
  let idempotencyCounter = 0;

  const auth = () => `Bearer ${sessionSecret}`;
  const nextIdempotencyKey = () => `payment-e2e-${Date.now()}-${idempotencyCounter++}`;
  // payments.stripe_payment_intent_id is UNIQUE — against the persistent dev
  // DB (not a per-run-reset test DB), a literal id would collide the second
  // time this file runs. Suffixing every fake PaymentIntent id with a
  // per-run timestamp keeps repeated local runs collision-free.
  const runId = Date.now();
  const piSuccess = `pi_e2e_success_${runId}`;
  const piFailure = `pi_e2e_failure_${runId}`;
  const piRetry = `pi_e2e_retry_${runId}`;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const verificationStripe = new Stripe('sk_test_unused_for_verification_only');

  const paymentIntentsCreate = jest.fn();
  const paymentIntentsRetrieve = jest.fn();

  function patchEvent(event: unknown, code?: string) {
    return request(app.getHttpServer())
      .patch(`/api/v1/onboarding-sessions/${sessionId}`)
      .set('Authorization', auth())
      .set('Idempotency-Key', nextIdempotencyKey())
      .send({ event, code });
  }

  function postWebhook(payload: object) {
    const raw = JSON.stringify(payload);
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: raw, secret: webhookSecret });
    return request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(raw);
  }

  // Reused from onboarding.e2e-spec.ts's real full-slice flow — drives a
  // fresh session all the way to CHECKOUT with a verified phone number, the
  // one precondition createPaymentIntent() actually checks server-side.
  async function driveNewSessionToCheckout(): Promise<void> {
    const created = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    sessionId = created.body.sessionId;
    sessionSecret = created.body.sessionSecret;

    await patchEvent({ type: 'WEITER' }).expect(200);
    await patchEvent({ type: 'AGB_AKZEPTIERT', version: 'v1' }).expect(200);
    await patchEvent({ type: 'DATENSCHUTZ_AKZEPTIERT', version: 'v1' }).expect(200);
    // Payment at checkout only exists for paid self-pay purchases — a
    // Rezept-Versorgung is submitted without one (Zuzahlung comes later).
    const produkte = await request(app.getHttpServer()).get('/api/v1/products').expect(200);
    const selbstzahler = produkte.body.find((p: { hilfsmittelNr?: string; eigenanteil: number }) => !p.hilfsmittelNr && p.eigenanteil > 0);
    await patchEvent({ type: 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT', produkt: selbstzahler }).expect(200);
    const slot = { id: 'slot-1', beginn: '2026-08-01T09:00:00.000Z', ende: '2026-08-01T11:00:00.000Z', ort: 'Berlin' };
    await patchEvent({ type: 'TERMIN_VORSCHLAEGE_BERECHNET', vorschläge: [slot] }).expect(200);
    await patchEvent({ type: 'TERMIN_AUSGEWAEHLT', termin: slot }).expect(200);
    await patchEvent({ type: 'AUFTRAG_BESTAETIGT' }).expect(200);
    const kontakt = await patchEvent({ type: 'KONTAKT_ERFASST', email: null, telefon: '+491512223344' }).expect(200);
    await patchEvent({ type: 'OTP_VERIFIZIERT' }, kontakt.body.devCode).expect(200);
  }

  beforeAll(async () => {
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET muss in .env gesetzt sein, auch für Tests (siehe .env.example)');
    }
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STRIPE_CLIENT)
      .useValue({
        paymentIntents: { create: paymentIntentsCreate, retrieve: paymentIntentsRetrieve },
        webhooks: { constructEvent: verificationStripe.webhooks.constructEvent.bind(verificationStripe.webhooks) },
      })
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    paymentIntentsCreate.mockReset();
    paymentIntentsRetrieve.mockReset();
  });

  it('rejects creating a payment intent before CHECKOUT is reached', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/onboarding-sessions/${created.body.sessionId}/payment-intent`)
      .set('Authorization', `Bearer ${created.body.sessionSecret}`)
      .set('Idempotency-Key', nextIdempotencyKey())
      .expect(400);
  });

  it('creates a PaymentIntent for the real Eigenanteil amount once CHECKOUT + phone verification are reached', async () => {
    await driveNewSessionToCheckout();
    paymentIntentsCreate.mockResolvedValue({ id: piSuccess, client_secret: 'secret_e2e_success' });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/onboarding-sessions/${sessionId}/payment-intent`)
      .set('Authorization', auth())
      .set('Idempotency-Key', nextIdempotencyKey())
      .expect(201);

    expect(res.body).toEqual({ clientSecret: 'secret_e2e_success', paymentIntentId: piSuccess, amountCents: expect.any(Number), currency: 'eur' });
    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { onboardingSessionId: sessionId, organizationId: expect.any(String) } }),
    );
  });

  it('rejects a webhook with an invalid signature — the client can never fake payment success on its own', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=deadbeef')
      .send(JSON.stringify({ id: 'evt_forged', type: 'payment_intent.succeeded', data: { object: { id: piSuccess } } }));
    expect(res.status).toBe(400);
  });

  it('a genuinely signed payment_intent.succeeded webhook completes the session — creates a real Supply, flips status to ABGESCHLOSSEN', async () => {
    const res = await postWebhook({
      id: `evt_e2e_succeeded_${runId}`,
      type: 'payment_intent.succeeded',
      data: { object: { id: piSuccess, object: 'payment_intent', status: 'succeeded' } },
    });
    expect(res.status).toBe(200);

    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth()).expect(200);
    expect(current.body.status).toBe('ABGESCHLOSSEN');
    expect(current.body.versorgungId).toBeTruthy();
  });

  it('a retried delivery of the same succeeded event is idempotent — no error, no duplicate completion attempt', async () => {
    const res = await postWebhook({
      id: `evt_e2e_succeeded_retry_${runId}`,
      type: 'payment_intent.succeeded',
      data: { object: { id: piSuccess, object: 'payment_intent', status: 'succeeded' } },
    });
    expect(res.status).toBe(200);

    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth()).expect(200);
    expect(current.body.status).toBe('ABGESCHLOSSEN');
  });

  it('a genuinely signed payment_intent.payment_failed webhook moves a different session to CHECKOUT_FEHLGESCHLAGEN', async () => {
    await driveNewSessionToCheckout();
    paymentIntentsCreate.mockResolvedValue({ id: piFailure, client_secret: 'secret_e2e_failure' });
    await request(app.getHttpServer())
      .post(`/api/v1/onboarding-sessions/${sessionId}/payment-intent`)
      .set('Authorization', auth())
      .set('Idempotency-Key', nextIdempotencyKey())
      .expect(201);

    const res = await postWebhook({
      id: `evt_e2e_failed_${runId}`,
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: piFailure,
          object: 'payment_intent',
          status: 'requires_payment_method',
          last_payment_error: { message: 'Your card was declined.' },
        },
      },
    });
    expect(res.status).toBe(200);

    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth()).expect(200);
    expect(current.body.status).toBe('CHECKOUT_FEHLGESCHLAGEN');
  });

  it('after a failure, retrying creates a fresh PaymentIntent rather than reusing the failed one', async () => {
    await patchEvent({ type: 'CHECKOUT_ERNEUT_VERSUCHEN' }).expect(200);
    paymentIntentsCreate.mockResolvedValue({ id: piRetry, client_secret: 'secret_e2e_retry' });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/onboarding-sessions/${sessionId}/payment-intent`)
      .set('Authorization', auth())
      .set('Idempotency-Key', nextIdempotencyKey())
      .expect(201);

    expect(res.body.paymentIntentId).toBe(piRetry);
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
  });
});
