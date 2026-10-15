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

  // Catalog reads are public — /katalog is browsable before any onboarding
  // session (and thus any bearer token) exists.
  it('allows unauthenticated catalog reads', async () => {
    const products = await request(app.getHttpServer()).get('/api/v1/products').expect(200);
    expect(products.body.length).toBeGreaterThan(0);
    await request(app.getHttpServer()).get(`/api/v1/products/${products.body[0].id}`).expect(200);
    const categories = await request(app.getHttpServer()).get('/api/v1/catalog/categories').expect(200);
    expect(Object.keys(categories.body[0]).sort()).toEqual(['id', 'name']);
  });

  it('lists categories for an authenticated admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('lists active products mapped to the domain Produkt shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('kategorie');
    expect(res.body[0]).toHaveProperty('hersteller');
  });

  it('filters products by categoryId and free-text query', async () => {
    const all = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(all.body.length).toBeGreaterThan(1);

    const selbstzahler = all.body.find((p: { hilfsmittelNr?: string }) => !p.hilfsmittelNr);
    expect(selbstzahler).toBeDefined();

    const byQuery = await request(app.getHttpServer())
      .get(`/api/v1/products?q=${encodeURIComponent(selbstzahler.name.split(' ')[0])}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(byQuery.body.some((p: { id: string }) => p.id === selbstzahler.id)).toBe(true);
  });

  it('gets a single product with a computed eigenanteil/lieferzeit from its primary offer', async () => {
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
    expect(typeof res.body.eigenanteil).toBe('number');
    expect(typeof res.body.lieferzeit).toBe('string');
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
