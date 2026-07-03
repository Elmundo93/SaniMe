import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

// The Krankenkassenkarte archive-match — the only re-login path in the app.
// Fixture customer seeded by src/db/seed/customers.seed.ts.
describe('Customers match (e2e)', () => {
  let app: INestApplication;
  let sessionId: string;
  let sessionSecret: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const created = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    sessionId = created.body.sessionId;
    sessionSecret = created.body.sessionSecret;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated match requests', () => {
    return request(app.getHttpServer()).post('/api/v1/customers/match').send({ insuredNumber: 'A123456789' }).expect(401);
  });

  it('404s for an unknown insured number', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customers/match')
      .set('Authorization', `Bearer ${sessionSecret}`)
      .send({ insuredNumber: 'NOPE-000' })
      .expect(404);
  });

  it('matches the fixture customer, claims the session, and returns their supply history', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers/match')
      .set('Authorization', `Bearer ${sessionSecret}`)
      .send({ insuredNumber: '  a123456789 ' })
      .expect(201);

    expect(res.body.customer.firstName).toBe('Max');
    expect(res.body.customer.lastName).toBe('Mustermann');
    expect(Array.isArray(res.body.addresses)).toBe(true);
    expect(Array.isArray(res.body.supplies)).toBe(true);

    // The same session secret keeps working post-claim — no new token needed.
    const current = await request(app.getHttpServer())
      .get('/api/v1/onboarding-sessions/current')
      .set('Authorization', `Bearer ${sessionSecret}`)
      .expect(200);
    expect(current.body.id).toBe(sessionId);
  });
});
