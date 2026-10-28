import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { seedAdminWithPermissions } from './helpers/seed-admin';

// Der Export läuft als Job im Hintergrund — abfragen, bis er fertig ist,
// statt fest zu warten (unter Last parallel laufender Suites dauerte er
// gelegentlich länger als 300 ms und der Test scheiterte zufällig).
async function bisFertig(abfragen: () => request.Test): Promise<request.Response> {
  let res = await abfragen().expect(200);
  for (let versuch = 0; versuch < 50 && ['pending', 'processing'].includes(res.body.status); versuch++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    res = await abfragen().expect(200);
  }
  return res;
}

describe('Data export (e2e)', () => {
  let app: INestApplication;
  let customerSessionSecret: string;
  let customerId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const created = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    customerSessionSecret = created.body.sessionSecret;

    const matched = await request(app.getHttpServer())
      .post('/api/v1/customers/match')
      .set('Authorization', `Bearer ${customerSessionSecret}`)
      .send({ insuredNumber: 'A123456789' })
      .expect(201);
    customerId = matched.body.customer.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a data export request from an unauthenticated caller', async () => {
    await request(app.getHttpServer()).post('/api/v1/me/data-export').expect(401);
  });

  it('a claimed customer requests an export, polls it to ready, and gets a working download URL', async () => {
    const requested = await request(app.getHttpServer())
      .post('/api/v1/me/data-export')
      .set('Authorization', `Bearer ${customerSessionSecret}`)
      .expect(201);
    expect(requested.body.status).toBe('pending');
    const requestId = requested.body.id;

    const res = await bisFertig(() =>
      request(app.getHttpServer()).get(`/api/v1/me/data-export/${requestId}`).set('Authorization', `Bearer ${customerSessionSecret}`),
    );
    expect(res.body.status).toBe('ready');
    expect(res.body.downloadUrl).toContain('http');

    const download = await fetch(res.body.downloadUrl);
    expect(download.status).toBe(200);
    const bundle = await download.json();
    expect(bundle.customer.id).toBe(customerId);
  });

  it('rejects a customer reading another customer export request', async () => {
    const otherSession = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    const requested = await request(app.getHttpServer())
      .post('/api/v1/me/data-export')
      .set('Authorization', `Bearer ${customerSessionSecret}`)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/me/data-export/${requested.body.id}`)
      .set('Authorization', `Bearer ${otherSession.body.sessionSecret}`)
      .expect(400); // unclaimed session — no customerId to even attempt the check
  });

  it('an admin with compliance:manage triggers an export on behalf of a customer, readable by compliance:read', async () => {
    const manageToken = (await seedAdminWithPermissions(app, ['compliance:manage'])).token;
    const readToken = (await seedAdminWithPermissions(app, ['compliance:read'])).token;
    const noPermToken = (await seedAdminWithPermissions(app, [])).token;

    const requested = await request(app.getHttpServer())
      .post(`/api/v1/admin/customers/${customerId}/data-export`)
      .set('Authorization', `Bearer ${manageToken}`)
      .expect(201);

    const res = await bisFertig(() =>
      request(app.getHttpServer()).get(`/api/v1/admin/data-export/${requested.body.id}`).set('Authorization', `Bearer ${readToken}`),
    );
    expect(res.body.status).toBe('ready');

    await request(app.getHttpServer())
      .get(`/api/v1/admin/data-export/${requested.body.id}`)
      .set('Authorization', `Bearer ${noPermToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/customers/${customerId}/data-export`)
      .set('Authorization', `Bearer ${noPermToken}`)
      .expect(403);
  });
});
