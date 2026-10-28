import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { OnboardingSessionsRepository } from '../src/modules/onboarding/onboarding-sessions.repository';
import { SupplyOrderService } from '../src/modules/supply-order/supply-order.service';
import { seedAdminWithPermissions } from './helpers/seed-admin';

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

    // order_notes.author_admin_id carries a real FK to admin_users, and
    // every route below is now RolesGuard-gated — both require a real
    // admin_users row with real role_permissions rows, not a synthetic sub.
    ({ token: adminToken, id: adminId } = await seedAdminWithPermissions(app, ['orders:read', 'orders:write']));

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
    expect(res.body.some((item: { supplyId: string; title: string }) => item.supplyId === supplyId && item.title === 'Antrag an die Krankenkasse senden')).toBe(
      true,
    );
  });

  it('lists all orders with supply details joined in', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/orders').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const found = res.body.eintraege.find((o: { orderId: string }) => o.orderId === orderId);
    expect(found).toBeDefined();
    expect(found.produktName).toBe('Rollstuhl Aktiv SB 40');
    expect(res.body.gesamt).toBeGreaterThanOrEqual(1);
    // Listen tragen keine Rezept-/Diagnosedaten.
    expect(found).not.toHaveProperty('diagnose');
  });

  it('filters orders by status and search term', async () => {
    const treffer = await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .query({ status: 'submitted', q: 'Aktiv SB' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(treffer.body.eintraege.some((o: { orderId: string }) => o.orderId === orderId)).toBe(true);

    const keine = await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .query({ status: 'delivered', q: 'Aktiv SB' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(keine.body.eintraege.some((o: { orderId: string }) => o.orderId === orderId)).toBe(false);

    await request(app.getHttpServer()).get('/api/v1/admin/orders').query({ status: 'erfunden' }).set('Authorization', `Bearer ${adminToken}`).expect(400);
  });

  it('gets an order detail composed of order, supply, notes, and appointment', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/admin/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.order.id).toBe(orderId);
    expect(res.body.supply.id).toBe(supplyId);
    expect(res.body.notes).toEqual([]);
    expect(res.body.appointment).toBeNull();
    expect(res.body.kunde).toBeNull();
    expect(res.body.notfall).toBeNull();
    expect(res.body.aufgaben.map((a: { title: string }) => a.title)).toContain('Antrag an die Krankenkasse senden');
  });

  it('sorts the inbox by urgency and lets an admin take over and release a task', async () => {
    const inbox = await request(app.getHttpServer()).get('/api/v1/admin/inbox').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const aufgabe = inbox.body.find((item: { supplyId: string }) => item.supplyId === supplyId);
    expect(aufgabe.dringlichkeit).toBe('neu');
    expect(aufgabe.orderId).toBe(orderId);

    await request(app.getHttpServer()).post(`/api/v1/admin/actions/${aufgabe.id}/uebernehmen`).set('Authorization', `Bearer ${adminToken}`).expect(204);
    const nachher = await request(app.getHttpServer()).get('/api/v1/admin/inbox').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(nachher.body.find((item: { id: string }) => item.id === aufgabe.id).assignedAdminId).toBe(adminId);

    await request(app.getHttpServer()).post(`/api/v1/admin/actions/${aufgabe.id}/freigeben`).set('Authorization', `Bearer ${adminToken}`).expect(204);
    // Schritt-Aufgaben erledigt der Statuswechsel, nicht ein Klick.
    await request(app.getHttpServer()).post(`/api/v1/admin/actions/${aufgabe.id}/erledigen`).set('Authorization', `Bearer ${adminToken}`).expect(400);
  });

  it('records a Notfall callback: not reached keeps it open, a promise closes it', async () => {
    await app.get(SupplyOrderService).notfallAnfragen(DEFAULT_TENANT_CONTEXT, supplyId, { grund: 'STURZGEFAHR', erreichbarkeit: 'GANZTAGS', telefon: '0151 2345678' }, null);
    const inbox = await request(app.getHttpServer()).get('/api/v1/admin/inbox').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(inbox.body[0].dringlichkeit).toBe('notfall');

    const detail = await request(app.getHttpServer()).get(`/api/v1/admin/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    const notfallId = detail.body.notfall.id;

    const nichtErreicht = await request(app.getHttpServer())
      .post(`/api/v1/admin/urgent-deliveries/${notfallId}/rueckruf`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ergebnis: 'NICHT_ERREICHT' })
      .expect(200);
    expect(nichtErreicht.body.abgeschlossen).toBe(false);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/urgent-deliveries/${notfallId}/rueckruf`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ergebnis: 'ZUGESAGT' })
      .expect(200);
    const danach = await request(app.getHttpServer()).get(`/api/v1/admin/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(danach.body.notfall).toBeNull();
    expect(danach.body.supply.timeline.some((t: { label: string }) => t.label === 'Notfalllieferung zugesagt')).toBe(true);
  });

  it('answers 409 when the status changed since the admin looked at it', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'AntragVersendet', erwarteterStatus: 'insurance_review' })
      .expect(409);
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
      .send({ type: 'InsuranceApproved', erwarteterStatus: 'submitted' })
      .expect(200);
    expect(res.body.status).toBe('approved');

    const inbox = await request(app.getHttpServer()).get('/api/v1/admin/inbox').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(inbox.body.some((item: { supplyId: string; title: string }) => item.supplyId === supplyId && item.title === 'Lieferant wählen')).toBe(true);
  });

  it('rejects an unauthenticated status transition', async () => {
    await request(app.getHttpServer()).patch(`/api/v1/admin/orders/${orderId}/status`).send({ type: 'SupplierAssigned' }).expect(401);
  });

  it('rejects a real admin with zero role_permissions rows (RolesGuard, not just AdminJwtAuthGuard)', async () => {
    const unprivileged = (await seedAdminWithPermissions(app, [])).token;
    await request(app.getHttpServer()).get('/api/v1/admin/inbox').set('Authorization', `Bearer ${unprivileged}`).expect(403);
  });
});
