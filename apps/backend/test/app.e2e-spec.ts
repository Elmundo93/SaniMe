import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

describe('AppModule (e2e)', () => {
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

  it('GET /api/v1/health reports a passing database indicator', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.details.database.status).toBe('up');
  });

  it('GET /api/v1/version matches package.json', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/version').expect(200);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../package.json');
    expect(res.body.version).toBe(pkg.version);
  });
});
