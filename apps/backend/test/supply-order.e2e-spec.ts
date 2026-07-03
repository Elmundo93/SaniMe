import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { OnboardingSessionsRepository } from '../src/modules/onboarding/onboarding-sessions.repository';
import { SupplyOrderService } from '../src/modules/supply-order/supply-order.service';

const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';

// A supplies/orders row is seeded directly via the real service against a
// real throwaway onboarding_sessions row (supplies.onboarding_session_id
// carries a real FK as of Phase 2.6). The true full-slice e2e proof of the
// onboarding->supply path lives in onboarding.e2e-spec.ts.
describe('Supply/Order (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let supplyId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService);
    adminToken = await jwt.signAsync(
      { sub: 'test-admin', email: 'test-admin@example.com' },
      { secret: process.env.ADMIN_JWT_SECRET, expiresIn: '5m' },
    );

    const supplyOrder = app.get(SupplyOrderService);
    const onboardingSessions = app.get(OnboardingSessionsRepository);
    const throwawaySession = await onboardingSessions.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);
    const result = await supplyOrder.createFromOnboarding(
      DEFAULT_TENANT_CONTEXT,
      {
        onboardingSessionId: throwawaySession.id,
        customerId: null,
        productId: SEEDED_PRODUCT_ID,
        supplierProductId: null,
        ocrResultId: null,
        productNameSnapshot: 'Rollstuhl Aktiv SB 40',
        manufacturerNameSnapshot: 'MobilTech',
        hilfsmittelNrSnapshot: '00.00.00.0001',
        customerCopaySnapshotCents: 1000,
        deliveryTimeLabelSnapshot: '3-5 Werktage',
        deliveryAddressId: null,
      },
      { type: 'system', id: null },
    );
    supplyId = result.supplyId;
    orderId = result.orderId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated reads', () => {
    return request(app.getHttpServer()).get('/api/v1/supplies').expect(401);
  });

  it('lists supplies and gets one by id with timeline/open actions', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/supplies')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.some((s: { id: string }) => s.id === supplyId)).toBe(true);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/supplies/${supplyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.status).toBe('submitted');
    expect(detail.body.timeline).toHaveLength(5);
    expect(detail.body.openActions).toHaveLength(1);
  });

  it('gets an order by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.status).toBe('submitted');
  });

  it('admin transitions the order status and rejects an invalid transition', async () => {
    const approve = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'InsuranceApproved' })
      .expect(200);
    expect(approve.body.status).toBe('approved');

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'Delivered' })
      .expect(400);
  });

  it('rejects PATCH /orders/:id/status from a non-admin', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .send({ type: 'InsuranceApproved' })
      .expect(401);
  });

  it('creates and resolves an open action', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/actions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'create', title: 'Termin bestätigen', description: 'Kunde kontaktieren', actionType: 'formular' })
      .expect(201);
    expect(created.body.title).toBe('Termin bestätigen');

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/actions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'resolve', actionId: created.body.id })
      .expect(201);
  });
});
