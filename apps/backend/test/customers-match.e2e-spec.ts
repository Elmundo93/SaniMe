import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { ConsentsRepository } from '../src/modules/consents/consents.repository';
import { InsurancePoliciesRepository } from '../src/modules/health-data/insurance-policies.repository';
import { OcrResultsRepository } from '../src/modules/health-data/ocr-results.repository';

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
    // Seed consent/OCR/insurance rows directly against the session (bypassing
    // the full FSM walk, which onboarding.e2e-spec.ts already covers) so the
    // claim's customerId backfill (Phase 1) has something real to migrate.
    const consents = app.get(ConsentsRepository);
    const insurancePolicies = app.get(InsurancePoliciesRepository);
    const ocrResults = app.get(OcrResultsRepository);

    await consents.record(DEFAULT_TENANT_CONTEXT, sessionId, 'agb', 'v1', '127.0.0.1');
    await insurancePolicies.upsertForSubject(DEFAULT_TENANT_CONTEXT, {
      subjectType: 'onboarding_session',
      subjectId: sessionId,
      customerId: null,
      insurerName: 'Techniker Krankenkasse',
      insurerIk: null,
      insuredNumber: 'A123456789',
    });
    const ocrRow = await ocrResults.create(DEFAULT_TENANT_CONTEXT, {
      subjectType: 'onboarding_session',
      subjectId: sessionId,
      documentId: null,
      patientName: 'Max Mustermann',
      patientDob: '15.03.1972',
      doctorName: 'Dr. Müller',
      doctorLanr: null,
      diagnose: 'G82.1',
      hilfsmittel: 'Rollstuhl',
      hilfsmittelNr: null,
      datum: '01.01.2026',
      confidence: {},
      rawEdited: false,
    });

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

    // Phase 1: the claim backfills customerId on every subject-scoped table,
    // subjectType/subjectId stay 'onboarding_session'/sessionId permanently.
    const customerId = res.body.customer.id;
    const [claimedConsent] = await consents.findHistoryForSubject(DEFAULT_TENANT_CONTEXT, 'onboarding_session', sessionId);
    expect(claimedConsent.customerId).toBe(customerId);
    const claimedPolicy = await insurancePolicies.findBySubject(DEFAULT_TENANT_CONTEXT, 'onboarding_session', sessionId);
    expect(claimedPolicy?.customerId).toBe(customerId);
    const claimedOcr = await ocrResults.findById(DEFAULT_TENANT_CONTEXT, ocrRow.id);
    expect(claimedOcr?.customerId).toBe(customerId);
  });
});
