import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { CustomersRepository } from '../src/modules/customer/customers.repository';
import { SupplyOrderService } from '../src/modules/supply-order/supply-order.service';
import { seedAdminWithPermissions } from './helpers/seed-admin';

const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';

function waitForJob(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uses a dedicated THROWAWAY customer (never the shared SEEDED_CUSTOMER_ID
// fixture) — this test permanently anonymizes whichever customer it targets.
describe('Deletion requests (e2e)', () => {
  let app: INestApplication;
  let customerId: string;
  let customerSessionSecret: string;
  let supplyId: string;
  let orderId: string;
  let manageToken: string;
  let readToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    manageToken = (await seedAdminWithPermissions(app, ['compliance:manage', 'orders:write'])).token;
    readToken = (await seedAdminWithPermissions(app, ['compliance:read'])).token;

    const insuredNumber = `THROWAWAYDEL${Date.now()}`;
    const customers = app.get(CustomersRepository);
    const customer = await customers.create(DEFAULT_TENANT_CONTEXT, { firstName: 'Throwaway', lastName: 'Deletion', insuredNumber });
    customerId = customer.id;

    // Real HTTP flow (matches customers-match.e2e-spec.ts's own pattern) —
    // a session created via repository.create() carries only a secret hash,
    // never a usable plaintext bearer token.
    const created = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    const sessionId = created.body.sessionId;
    customerSessionSecret = created.body.sessionSecret;
    await request(app.getHttpServer())
      .post('/api/v1/customers/match')
      .set('Authorization', `Bearer ${customerSessionSecret}`)
      .send({ insuredNumber })
      .expect(201);

    const supplyOrder = app.get(SupplyOrderService);
    const supply = await supplyOrder.createFromOnboarding(
      DEFAULT_TENANT_CONTEXT,
      {
        onboardingSessionId: sessionId,
        customerId,
        productId: SEEDED_PRODUCT_ID,
        supplierProductId: null,
        ocrResultId: null,
        productNameSnapshot: 'Test-Produkt',
        manufacturerNameSnapshot: 'Test-Hersteller',
        hilfsmittelNrSnapshot: '00.00.00.0001',
        customerCopaySnapshotCents: 1000,
        deliveryTimeLabelSnapshot: '3-5 Werktage',
        deliveryAddressId: null,
      },
      { type: 'system', id: null },
    );
    supplyId = supply.supplyId;
    orderId = supply.orderId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated deletion request', async () => {
    await request(app.getHttpServer()).post('/api/v1/me/deletion-requests').expect(401);
  });

  let requestId: string;

  it('a claimed customer requests deletion', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/me/deletion-requests')
      .set('Authorization', `Bearer ${customerSessionSecret}`)
      .send({ reasonCode: 'privacy_concern' })
      .expect(201);
    expect(res.body.status).toBe('requested');
    requestId = res.body.id;
  });

  it('rejects approval while a supply is still in flight (the guard) — request ends up under_review, not approved', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/deletion-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ decision: 'approved' })
      .expect(400);
    expect(res.body.message).toBeTruthy();

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/deletion-requests/${requestId}`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(200);
    expect(detail.body.status).toBe('under_review');
  });

  it('approves once the supply reaches a terminal status, then executes to completion', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ type: 'InsuranceRejected' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ type: 'Archived' })
      .expect(200);

    const reviewed = await request(app.getHttpServer())
      .post(`/api/v1/admin/deletion-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ decision: 'approved', note: 'Alle Versorgungen abgeschlossen.' })
      .expect(201);
    expect(reviewed.body.status).toBe('approved');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/deletion-requests/${requestId}/execute`)
      .set('Authorization', `Bearer ${manageToken}`)
      .expect(201);

    await waitForJob();

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/deletion-requests/${requestId}`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(200);
    expect(detail.body.status).toBe('completed');
    expect(detail.body.executedAt).toBeTruthy();

    const customers = app.get(CustomersRepository);
    const anonymized = await customers.findById(DEFAULT_TENANT_CONTEXT, customerId);
    expect(anonymized?.firstName).toBe('Gelöscht');

    // The supply/order graph is retained unchanged — only the customer
    // identity is pseudonymized.
    const supply = await request(app.getHttpServer())
      .get(`/api/v1/supplies/${supplyId}`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(200);
    expect(supply.body.id).toBe(supplyId);
  });

  it('rejects a compliance:read admin from reviewing or executing (needs compliance:manage)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/deletion-requests/${requestId}/execute`)
      .set('Authorization', `Bearer ${readToken}`)
      .expect(403);
  });
});
