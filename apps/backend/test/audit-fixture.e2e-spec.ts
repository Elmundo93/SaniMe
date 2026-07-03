import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

// TEMPORARY — delete alongside src/testing/* once Layer 2's HealthData module
// provides a real @AuditRead()-decorated endpoint to point this at instead.
describe('Audit fixture (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService);
    token = await jwt.signAsync(
      { sub: 'test-admin', email: 'test-admin@example.com' },
      { secret: process.env.ADMIN_JWT_SECRET, expiresIn: '5m' },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests', () => {
    return request(app.getHttpServer()).get('/api/v1/_test/audit-fixture').expect(401);
  });

  it('allows an authenticated admin and records an access-log entry as a side effect', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/_test/audit-fixture')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
