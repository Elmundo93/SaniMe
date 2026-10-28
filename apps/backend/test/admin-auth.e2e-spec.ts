import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { DRIZZLE, type Database } from '../src/db/client';
import { adminUsers, rolePermissions } from '../src/db/schema';
import { totpCode } from '../src/modules/auth/admin-totp';

describe('Admin-Anmeldung mit 2FA (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  const email = `anmeldung-${Math.random()}@example.com`;
  const passwort = 'sicheres-passwort';
  let geheimnis: string;
  let cookie: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DRIZZLE);
    const [admin] = await db
      .insert(adminUsers)
      .values({ organizationId: DEFAULT_TENANT_CONTEXT.organizationId, email, passwordHash: await hash(passwort, 4), name: 'Anna Test' })
      .returning();
    await db.insert(rolePermissions).values({ organizationId: DEFAULT_TENANT_CONTEXT.organizationId, adminUserId: admin.id, permission: 'orders:read' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('lehnt ein falsches Passwort ab', async () => {
    await request(app.getHttpServer()).post('/api/v1/admin/auth/login').send({ email, password: 'falsch' }).expect(401);
  });

  it('richtet beim ersten Login die 2FA ein und setzt erst danach das Sitzungs-Cookie', async () => {
    const login = await request(app.getHttpServer()).post('/api/v1/admin/auth/login').send({ email, password: passwort }).expect(200);
    expect(login.body.schritt).toBe('einrichten');
    expect(login.headers['set-cookie']).toBeUndefined();
    geheimnis = login.body.geheimnis;

    await request(app.getHttpServer())
      .post('/api/v1/admin/auth/code')
      .send({ challengeToken: login.body.challengeToken, code: '000000' === totpCode(geheimnis, Date.now()) ? '111111' : '000000' })
      .expect(401);

    const code = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/code')
      .send({ challengeToken: login.body.challengeToken, code: totpCode(geheimnis, Date.now()) })
      .expect(200);
    expect(code.body).toMatchObject({ email, name: 'Anna Test', permissions: ['orders:read'] });
    const setCookie = ([] as string[]).concat(code.headers['set-cookie'] ?? []);
    expect(setCookie[0]).toMatch(/sanime_admin=.+HttpOnly/);
    expect(setCookie[0]).toMatch(/SameSite=Strict/);
    cookie = setCookie[0].split(';')[0];

    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    expect(row.totpActivatedAt).not.toBeNull();
    expect(row.totpSecretEncrypted).not.toContain(geheimnis);
  });

  it('fragt beim nächsten Login nur noch den Code ab', async () => {
    const login = await request(app.getHttpServer()).post('/api/v1/admin/auth/login').send({ email, password: passwort }).expect(200);
    expect(login.body).toEqual({ schritt: 'code', challengeToken: expect.any(String) });
  });

  it('akzeptiert das Zwischen-Token nicht als Zugang', async () => {
    const login = await request(app.getHttpServer()).post('/api/v1/admin/auth/login').send({ email, password: passwort }).expect(200);
    await request(app.getHttpServer()).get('/api/v1/admin/auth/me').set('Authorization', `Bearer ${login.body.challengeToken}`).expect(401);
  });

  it('liest mit dem Cookie, verlangt für Schreibzugriffe aber den CSRF-Header', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/auth/me').set('Cookie', cookie).expect(200);
    await request(app.getHttpServer()).get('/api/v1/admin/inbox').set('Cookie', cookie).expect(200);
    await request(app.getHttpServer()).post('/api/v1/admin/auth/logout').set('Cookie', cookie).expect(403);
    const logout = await request(app.getHttpServer()).post('/api/v1/admin/auth/logout').set('Cookie', cookie).set('X-SaniMe-Admin', '1').expect(204);
    expect(([] as string[]).concat(logout.headers['set-cookie'] ?? [])[0]).toMatch(/sanime_admin=;/);
  });

  it('sperrt deaktivierte Personen sofort aus, auch mit gültigem Cookie', async () => {
    await db.update(adminUsers).set({ deactivatedAt: new Date() }).where(eq(adminUsers.email, email));
    await request(app.getHttpServer()).get('/api/v1/admin/auth/me').set('Cookie', cookie).expect(401);
  });
});
