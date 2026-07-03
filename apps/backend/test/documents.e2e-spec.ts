import 'dotenv/config';
import { createHash } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

describe('Documents (e2e)', () => {
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

  it('rejects unauthenticated requests', () => {
    return request(app.getHttpServer()).post('/api/v1/documents/upload-url').send({ mimeType: 'image/jpeg' }).expect(401);
  });

  it('rejects registering a document whose object was never uploaded to storage', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'prescription',
        storageKey: 'documents/does-not-exist',
        hash: 'deadbeef',
        mimeType: 'image/jpeg',
        sizeBytes: 123,
      })
      .expect(400);
  });

  it('full upload flow: presigned PUT, real upload to MinIO, register, get with presigned GET, set status', async () => {
    const uploadUrlRes = await request(app.getHttpServer())
      .post('/api/v1/documents/upload-url')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ mimeType: 'image/jpeg' })
      .expect(201);
    expect(uploadUrlRes.body.storageKey).toMatch(/^documents\//);
    expect(uploadUrlRes.body.uploadUrl).toContain('http');

    const fileBytes = Buffer.from('fake-jpeg-bytes-for-e2e-test');
    const putRes = await fetch(uploadUrlRes.body.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: fileBytes,
    });
    expect(putRes.status).toBe(200);

    const hash = createHash('sha256').update(fileBytes).digest('hex');
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'prescription',
        storageKey: uploadUrlRes.body.storageKey,
        hash,
        mimeType: 'image/jpeg',
        sizeBytes: fileBytes.byteLength,
      })
      .expect(201);
    expect(registerRes.body.status).toBe('uploaded');
    const documentId = registerRes.body.id;

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(getRes.body.downloadUrl).toContain('http');

    const statusRes = await request(app.getHttpServer())
      .patch(`/api/v1/documents/${documentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'verified' })
      .expect(200);
    expect(statusRes.body.status).toBe('verified');
  });

  it('rejects an unknown document status value', async () => {
    const uploadUrlRes = await request(app.getHttpServer())
      .post('/api/v1/documents/upload-url')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ mimeType: 'image/jpeg' })
      .expect(201);
    await fetch(uploadUrlRes.body.uploadUrl, { method: 'PUT', body: Buffer.from('x') });
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'prescription', storageKey: uploadUrlRes.body.storageKey, hash: 'x', mimeType: 'image/jpeg', sizeBytes: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/documents/${registerRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'not_a_real_status' })
      .expect(400);
  });
});
