import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

describe('Catalog (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated catalog reads', () => {
    return request(app.getHttpServer()).get('/api/v1/products').expect(401);
  });

  it('lists categories for an authenticated admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('lists active products with category/manufacturer names joined in', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('categoryName');
    expect(res.body[0]).toHaveProperty('manufacturerName');
  });

  it('gets a single product with supplier offers', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const id = list.body[0].id;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.id).toBe(id);
    expect(Array.isArray(res.body.offers)).toBe(true);
    expect(res.body.offers[0]).toHaveProperty('deliveryTimeDays');
  });

  it('404s for an unknown product id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('restricts GET /suppliers to admins only', async () => {
    await request(app.getHttpServer()).get('/api/v1/suppliers').expect(401);
    const res = await request(app.getHttpServer())
      .get('/api/v1/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
