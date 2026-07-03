import 'dotenv/config';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import { CustomersRepository, normalizeInsuredNumber } from './customers.repository';

// Runs against the real docker-compose Postgres (seeded via
// src/db/seed/customers.seed.ts) — there's no Customer controller yet to
// e2e-test through (see customer.module.ts), so this proves the matching
// logic directly against a real database instead.
describe('CustomersRepository (integration)', () => {
  let repository: CustomersRepository;
  let pool: Pool;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    repository = new CustomersRepository(createDatabase(pool));
  });

  afterAll(async () => {
    await pool.end();
  });

  it('normalizes insured numbers the same way the client mock does', () => {
    expect(normalizeInsuredNumber('  a123456789 ')).toBe('A123456789');
  });

  it('finds the seeded fixture customer by insured number, case/whitespace-insensitive', async () => {
    const found = await repository.findByInsuredNumber(DEFAULT_TENANT_CONTEXT, '  a123456789 ');
    expect(found).not.toBeNull();
    expect(found?.firstName).toBe('Max');
    expect(found?.lastName).toBe('Mustermann');
  });

  it('returns null for an unknown insured number (no fuzzy matching)', async () => {
    const found = await repository.findByInsuredNumber(DEFAULT_TENANT_CONTEXT, 'NOPE-000');
    expect(found).toBeNull();
  });
});
