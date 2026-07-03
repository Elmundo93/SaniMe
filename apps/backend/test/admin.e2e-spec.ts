import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DRIZZLE, type Database } from '../src/db/client';
import { adminUsers } from '../src/db/schema';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { OnboardingSessionsRepository } from '../src/modules/onboarding/onboarding-sessions.repository';
import { SupplyOrderService } from '../src/modules/supply-order/supply-order.service';

const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let adminId: string;
  let supplyId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    // order_notes.author_admin_id carries a real FK to admin_users, unlike
    // the plain-text actorId columns other e2e specs get away with using
    // 'test-admin' for — a real row is required here.
    const db: Database = app.get(DRIZZLE);
    const [admin] = await db
      .insert(adminUsers)
      .values({ organizationId: DEFAULT_TENANT_CONTEXT.organizationId, email: `test-admin-${Math.random()}@example.com`, passwordHash: 'unused' })
      .returning();
    adminId = admin.id;
    const jwt = app.get(JwtService);
    adminToken = await jwt.signAsync({ sub: adminId, email: admin.email }, { secret: process.env.ADMIN_JWT_SECRET, expiresIn: '5m' });

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

  it('rejects unauthenticated inbox reads', () => {
    return request(app.getHttpServer()).get('/api/v1/admin/inbox').expect(401);
  });

  it('lists the open action created by the onboarding-completion replay in the inbox', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/inbox').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.some((item: { supplyId: string; title: string }) => item.supplyId === supplyId && item.title === 'Krankenkasse kontaktieren')).toBe(
      true,
    );
  });

  it('lists all orders with supply details joined in', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/orders').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const found = res.body.find((o: { id: string }) => o.id === orderId);
    expect(found).toBeDefined();
    expect(found.productNameSnapshot).toBe('Rollstuhl Aktiv SB 40');
  });

  it('gets an order detail composed of order, supply, notes, and appointment', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/admin/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.order.id).toBe(orderId);
    expect(res.body.supply.id).toBe(supplyId);
    expect(res.body.notes).toEqual([]);
    expect(res.body.appointment).toBeNull();
  });

  it('adds a note and an admin-authored timeline entry', async () => {
    const note = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${orderId}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Kunde telefonisch erreicht.' })
      .expect(201);
    expect(note.body.body).toBe('Kunde telefonisch erreicht.');

    const timelineEntry = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${orderId}/timeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Rückruf', description: 'Kunde wurde zurückgerufen.' })
      .expect(201);
    expect(timelineEntry.body.source).toBe('admin');

    const detail = await request(app.getHttpServer()).get(`/api/v1/admin/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(detail.body.notes).toHaveLength(1);
    expect(detail.body.supply.timeline.some((t: { source: string }) => t.source === 'admin')).toBe(true);
  });

  it('transitions order status via the new additive /admin route, same as the existing /orders route', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'InsuranceApproved' })
      .expect(200);
    expect(res.body.status).toBe('approved');

    const inbox = await request(app.getHttpServer()).get('/api/v1/admin/inbox').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(inbox.body.some((item: { supplyId: string; title: string }) => item.supplyId === supplyId && item.title === 'Lieferant wählen')).toBe(true);
  });

  it('rejects an unauthenticated status transition', async () => {
    await request(app.getHttpServer()).patch(`/api/v1/admin/orders/${orderId}/status`).send({ type: 'SupplierAssigned' }).expect(401);
  });
});
