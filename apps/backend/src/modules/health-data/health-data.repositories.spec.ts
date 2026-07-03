import 'dotenv/config';
import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import { InsurancePoliciesRepository } from './insurance-policies.repository';
import { OcrResultsRepository } from './ocr-results.repository';

// Runs against the real docker-compose Postgres — no HealthData controller
// exists yet to e2e-test through (consumed internally by Onboarding, Phase
// 2.6), so this proves the polymorphic-subject read/write logic directly.
describe('HealthData repositories (integration)', () => {
  let pool: Pool;
  let insurancePolicies: InsurancePoliciesRepository;
  let ocrResults: OcrResultsRepository;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    insurancePolicies = new InsurancePoliciesRepository(db);
    ocrResults = new OcrResultsRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('InsurancePoliciesRepository', () => {
    it('creates then upserts a policy for the same subject', async () => {
      const subjectId = randomUUID();
      const created = await insurancePolicies.upsertForSubject(DEFAULT_TENANT_CONTEXT, {
        subjectType: 'onboarding_session',
        subjectId,
        customerId: null,
        insurerName: 'Techniker Krankenkasse',
        insurerIk: '260940566',
        insuredNumber: 'A123456789',
      });
      expect(created.insurerName).toBe('Techniker Krankenkasse');

      const updated = await insurancePolicies.upsertForSubject(DEFAULT_TENANT_CONTEXT, {
        subjectType: 'onboarding_session',
        subjectId,
        customerId: null,
        insurerName: 'AOK',
        insurerIk: null,
        insuredNumber: 'A123456789',
      });
      expect(updated.insurerName).toBe('AOK');

      const found = await insurancePolicies.findBySubject(DEFAULT_TENANT_CONTEXT, 'onboarding_session', subjectId);
      expect(found?.insurerName).toBe('AOK');
    });

    it('backfills customerId on claim', async () => {
      // Uses the fixture customer seeded by src/db/seed/customers.seed.ts —
      // the FK constraint on insurance_policies.customer_id is real, so a
      // random UUID would correctly be rejected here.
      const FIXTURE_CUSTOMER_ID = '50000000-0000-0000-0000-000000000001';
      const subjectId = randomUUID();
      await insurancePolicies.upsertForSubject(DEFAULT_TENANT_CONTEXT, {
        subjectType: 'onboarding_session',
        subjectId,
        customerId: null,
        insurerName: 'TK',
        insurerIk: null,
        insuredNumber: 'B000000001',
      });
      await insurancePolicies.claimToCustomer(DEFAULT_TENANT_CONTEXT, 'onboarding_session', subjectId, FIXTURE_CUSTOMER_ID);
      const found = await insurancePolicies.findBySubject(DEFAULT_TENANT_CONTEXT, 'onboarding_session', subjectId);
      expect(found?.customerId).toBe(FIXTURE_CUSTOMER_ID);
    });
  });

  describe('OcrResultsRepository', () => {
    it('creates an OCR result and finds it by subject, unedited by default', async () => {
      const subjectId = randomUUID();
      const created = await ocrResults.create(DEFAULT_TENANT_CONTEXT, {
        subjectType: 'onboarding_session',
        subjectId,
        documentId: null,
        patientName: 'Max Mustermann',
        patientDob: '15.03.1972',
        doctorName: 'Dr. med. Sabine Müller',
        doctorLanr: '123456700',
        diagnose: 'G82.1',
        hilfsmittel: 'Rollstuhl, faltbar',
        hilfsmittelNr: null,
        confidence: { patient: 'high' },
        rawEdited: false,
      });
      expect(created.rawEdited).toBe(false);

      const found = await ocrResults.findBySubject(DEFAULT_TENANT_CONTEXT, 'onboarding_session', subjectId);
      expect(found?.patientName).toBe('Max Mustermann');
    });

    it('marks a result as rawEdited after a field correction (CLAUDE.md: OCR output is never final)', async () => {
      const subjectId = randomUUID();
      const created = await ocrResults.create(DEFAULT_TENANT_CONTEXT, {
        subjectType: 'onboarding_session',
        subjectId,
        documentId: null,
        patientName: 'Falscher Name',
        patientDob: '01.01.2000',
        doctorName: 'Dr. Test',
        doctorLanr: null,
        diagnose: 'X',
        hilfsmittel: 'Y',
        hilfsmittelNr: null,
        confidence: {},
        rawEdited: false,
      });

      await ocrResults.patchFields(DEFAULT_TENANT_CONTEXT, created.id, { patientName: 'Korrigierter Name' });

      const found = await ocrResults.findById(DEFAULT_TENANT_CONTEXT, created.id);
      expect(found?.patientName).toBe('Korrigierter Name');
      expect(found?.rawEdited).toBe(true);
    });
  });
});
