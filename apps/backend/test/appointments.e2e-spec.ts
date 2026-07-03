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

const SEEDED_SUPPLIER_ID = '30000000-0000-0000-0000-000000000001';
const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';

describe('Appointments (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
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
    orderId = result.orderId;
    await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, orderId, { type: 'InsuranceApproved' }, { type: 'admin', id: 'test' });
    await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, orderId, { type: 'SupplierAssigned' }, { type: 'admin', id: 'test' });
    await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, orderId, { type: 'Ordered' }, { type: 'admin', id: 'test' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated slot proposals', () => {
    return request(app.getHttpServer())
      .get('/api/v1/appointments/slots')
      .query({ supplierId: SEEDED_SUPPLIER_ID, productId: SEEDED_PRODUCT_ID })
      .expect(401);
  });

  it('proposes slots for an authenticated admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/appointments/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ supplierId: SEEDED_SUPPLIER_ID, productId: SEEDED_PRODUCT_ID, count: 2 })
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('start');
    expect(res.body[0]).toHaveProperty('end');
  });

  it('400s a slot proposal with a malformed supplierId', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/appointments/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ supplierId: 'not-a-uuid', productId: SEEDED_PRODUCT_ID })
      .expect(400);
  });

  it('books an appointment, transitioning the order to appointment_scheduled', async () => {
    const slots = await request(app.getHttpServer())
      .get('/api/v1/appointments/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ supplierId: SEEDED_SUPPLIER_ID, productId: SEEDED_PRODUCT_ID, count: 1 })
      .expect(200);
    const [slot] = slots.body;

    const booked = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderId, supplierId: SEEDED_SUPPLIER_ID, scheduledStart: slot.start, scheduledEnd: slot.end, addressId: null })
      .expect(201);
    expect(booked.body.status).toBe('confirmed');

    const order = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(order.body.status).toBe('appointment_scheduled');
  });

  it('rejects an unauthenticated booking attempt', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({ orderId, supplierId: SEEDED_SUPPLIER_ID, scheduledStart: new Date().toISOString(), scheduledEnd: new Date().toISOString() })
      .expect(401);
  });
});
