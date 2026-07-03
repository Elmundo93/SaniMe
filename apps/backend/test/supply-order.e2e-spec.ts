import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DRIZZLE, type Database } from '../src/db/client';
import { accessLogs } from '../src/db/schema';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { OnboardingSessionsRepository } from '../src/modules/onboarding/onboarding-sessions.repository';
import { SupplyOrderService } from '../src/modules/supply-order/supply-order.service';
import { seedAdminWithPermissions } from './helpers/seed-admin';

const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';
const SEEDED_CUSTOMER_ID = '50000000-0000-0000-0000-000000000001'; // Max Mustermann, insuredNumber A123456789

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

    adminToken = (await seedAdminWithPermissions(app, ['orders:read', 'orders:write'])).token;

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

  // Phase 3 (Compliance): before this fix, any authenticated customer
  // session — including one never claimed to a real customer — could list
  // every customer's supplies and fetch any order by id.
  describe('customer ownership isolation on GET /supplies and GET /orders/:id', () => {
    let ownedSupplyId: string;
    let ownedOrderId: string;
    let unclaimedSessionSecret: string;

    beforeAll(async () => {
      const supplyOrder = app.get(SupplyOrderService);
      const onboardingSessions = app.get(OnboardingSessionsRepository);

      const ownerSession = await onboardingSessions.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);
      const owned = await supplyOrder.createFromOnboarding(
        DEFAULT_TENANT_CONTEXT,
        {
          onboardingSessionId: ownerSession.id,
          customerId: SEEDED_CUSTOMER_ID,
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
      ownedSupplyId = owned.supplyId;
      ownedOrderId = owned.orderId;

      const created = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
      unclaimedSessionSecret = created.body.sessionSecret;
    });

    it('an unclaimed customer session gets 403 on a supply/order it does not own, and on the list too (fail closed, not an empty 200)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/supplies/${ownedSupplyId}`)
        .set('Authorization', `Bearer ${unclaimedSessionSecret}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/api/v1/orders/${ownedOrderId}`)
        .set('Authorization', `Bearer ${unclaimedSessionSecret}`)
        .expect(403);

      // resolveOwnerFilter fails closed for an unidentified session — this
      // must never resolve to "unrestricted" (which is reserved for the
      // absence of a customer principal, i.e. an admin caller).
      await request(app.getHttpServer())
        .get('/api/v1/supplies')
        .set('Authorization', `Bearer ${unclaimedSessionSecret}`)
        .expect(403);
    });

    it('the owning customer, once claimed, can read their own supply/order — and an access_logs row is written per read', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customers/match')
        .set('Authorization', `Bearer ${unclaimedSessionSecret}`)
        .send({ insuredNumber: 'A123456789' })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/supplies/${ownedSupplyId}`)
        .set('Authorization', `Bearer ${unclaimedSessionSecret}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/orders/${ownedOrderId}`)
        .set('Authorization', `Bearer ${unclaimedSessionSecret}`)
        .expect(200);

      const list = await request(app.getHttpServer())
        .get('/api/v1/supplies')
        .set('Authorization', `Bearer ${unclaimedSessionSecret}`)
        .expect(200);
      expect(list.body.some((s: { id: string }) => s.id === ownedSupplyId)).toBe(true);

      const db: Database = app.get(DRIZZLE);
      const supplyAccessLogs = await db.select().from(accessLogs).where(eq(accessLogs.resourceId, ownedSupplyId));
      expect(supplyAccessLogs.length).toBeGreaterThan(0);
      const orderAccessLogs = await db.select().from(accessLogs).where(eq(accessLogs.resourceId, ownedOrderId));
      expect(orderAccessLogs.length).toBeGreaterThan(0);
    });

    it('rejects a customer session mismatching the ownership check with 403, not a silent empty result, for GET /orders/:id', async () => {
      const otherSession = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
      await request(app.getHttpServer())
        .get(`/api/v1/orders/${ownedOrderId}`)
        .set('Authorization', `Bearer ${otherSession.body.sessionSecret}`)
        .expect(403);
    });
  });
});
