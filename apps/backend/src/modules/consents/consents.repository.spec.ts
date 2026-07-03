import 'dotenv/config';
import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import { ConsentsRepository } from './consents.repository';

// Seeded via src/db/seed/customers.seed.ts.
const SEEDED_CUSTOMER_ID = '50000000-0000-0000-0000-000000000001';

describe('ConsentsRepository (integration)', () => {
  let pool: Pool;
  let repository: ConsentsRepository;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    repository = new ConsentsRepository(createDatabase(pool));
  });

  afterAll(async () => {
    await pool.end();
  });

  it('is append-only: re-recording the same consentType inserts a new row instead of overwriting', async () => {
    const subjectId = randomUUID();

    await repository.record(DEFAULT_TENANT_CONTEXT, subjectId, 'agb', 'v1', '127.0.0.1');
    await repository.record(DEFAULT_TENANT_CONTEXT, subjectId, 'agb', 'v2', '127.0.0.1');

    const history = await repository.findHistoryForSubject(DEFAULT_TENANT_CONTEXT, 'onboarding_session', subjectId);
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe('v1');
    expect(history[1].version).toBe('v2');
  });

  it('findLatest returns the most recently recorded version, not the first', async () => {
    const subjectId = randomUUID();

    await repository.record(DEFAULT_TENANT_CONTEXT, subjectId, 'datenschutz', 'v1', null);
    await repository.record(DEFAULT_TENANT_CONTEXT, subjectId, 'datenschutz', 'v3', null);

    const latest = await repository.findLatest(DEFAULT_TENANT_CONTEXT, subjectId, 'datenschutz');
    expect(latest?.version).toBe('v3');
  });

  it('claimToCustomer backfills customerId without touching subjectType/subjectId, and findHistoryForCustomer spans multiple onboarding sessions', async () => {
    const sessionA = randomUUID();
    const sessionB = randomUUID();

    await repository.record(DEFAULT_TENANT_CONTEXT, sessionA, 'agb', 'v1', null);
    await repository.record(DEFAULT_TENANT_CONTEXT, sessionB, 'agb', 'v1', null);

    await repository.claimToCustomer(DEFAULT_TENANT_CONTEXT, 'onboarding_session', sessionA, SEEDED_CUSTOMER_ID);
    await repository.claimToCustomer(DEFAULT_TENANT_CONTEXT, 'onboarding_session', sessionB, SEEDED_CUSTOMER_ID);

    const [claimedA] = await repository.findHistoryForSubject(DEFAULT_TENANT_CONTEXT, 'onboarding_session', sessionA);
    expect(claimedA.subjectType).toBe('onboarding_session');
    expect(claimedA.subjectId).toBe(sessionA);
    expect(claimedA.customerId).toBe(SEEDED_CUSTOMER_ID);

    const forCustomer = await repository.findHistoryForCustomer(DEFAULT_TENANT_CONTEXT, SEEDED_CUSTOMER_ID);
    expect(forCustomer.filter((row) => row.subjectId === sessionA || row.subjectId === sessionB)).toHaveLength(2);
  });
});
