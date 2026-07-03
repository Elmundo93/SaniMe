import 'dotenv/config';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

// TEMPORARY — delete alongside src/testing/* once Layer 2 provides a real
// mutating business endpoint (e.g. POST /onboarding-sessions) to point this at.
describe('Idempotency fixture (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('replays the stored response for a repeated Idempotency-Key with the same body', async () => {
    const key = `test-key-${randomUUID()}`;
    const body = { foo: 'bar' };

    const first = await request(app.getHttpServer())
      .post('/api/v1/_test/idempotency-fixture')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/_test/idempotency-fixture')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    expect(second.body).toEqual(first.body);
  });

  it('rejects a reused key whose body does not match the original request', async () => {
    const key = `test-key-${randomUUID()}`;

    await request(app.getHttpServer())
      .post('/api/v1/_test/idempotency-fixture')
      .set('Idempotency-Key', key)
      .send({ foo: 'bar' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/_test/idempotency-fixture')
      .set('Idempotency-Key', key)
      .send({ foo: 'different' })
      .expect(409);
  });
});
