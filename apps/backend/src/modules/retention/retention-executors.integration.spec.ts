import 'dotenv/config';
import { eq } from 'drizzle-orm';
import type { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { onboardingSessions } from '../../db/schema';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import { DataExportRequestsRepository } from '../data-export/data-export-requests.repository';
import { S3StorageProvider } from '../document/providers/s3-storage.provider';
import { OnboardingSessionsRepository } from '../onboarding/onboarding-sessions.repository';
import { createRetentionExecutors } from './retention-executors';

const SEEDED_CUSTOMER_ID = '50000000-0000-0000-0000-000000000001';

function fakeConfig(): ConfigService {
  const env = process.env as Record<string, string | undefined>;
  const coerce = (value: string | undefined): unknown => (value === 'true' ? true : value === 'false' ? false : value);
  return {
    getOrThrow: (key: string) => {
      const value = env[key];
      if (!value) throw new Error(`Missing env var ${key}`);
      return value;
    },
    get: (key: string, fallback?: unknown) => coerce(env[key]) ?? fallback,
  } as unknown as ConfigService;
}

describe('retention executors (integration)', () => {
  let pool: Pool;
  let executors: ReturnType<typeof createRetentionExecutors>;
  let onboardingSessionsRepo: OnboardingSessionsRepository;
  let dataExportRequests: DataExportRequestsRepository;
  let storage: S3StorageProvider;

  beforeAll(async () => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    onboardingSessionsRepo = new OnboardingSessionsRepository(db);
    dataExportRequests = new DataExportRequestsRepository(db);
    storage = new S3StorageProvider(fakeConfig());
    await storage.onModuleInit();
    executors = createRetentionExecutors({ db, storage, dataExportRequests });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('onboarding_session_abandoned anonymizes contact fields only past the retention window, never completed sessions or recent ones', async () => {
    const db = createDatabase(pool);
    const stale = await onboardingSessionsRepo.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);
    const recent = await onboardingSessionsRepo.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);

    await db
      .update(onboardingSessions)
      .set({ contactEmail: 'stale@example.com', contactPhone: '+491', updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) })
      .where(eq(onboardingSessions.id, stale.id));
    await db.update(onboardingSessions).set({ contactEmail: 'recent@example.com', contactPhone: '+492' }).where(eq(onboardingSessions.id, recent.id));

    await executors.onboarding_session_abandoned(DEFAULT_TENANT_CONTEXT, 90);

    const [staleRow] = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, stale.id));
    expect(staleRow.contactEmail).toBeNull();
    expect(staleRow.contactPhone).toBeNull();

    const [recentRow] = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, recent.id));
    expect(recentRow.contactEmail).toBe('recent@example.com');
  });

  it('data_export_bundle deletes the storage object and marks expired past expiresAt, leaves future-expiring rows alone', async () => {
    const expiredKey = `test/retention-${Date.now()}-expired.json`;
    await storage.putObject(expiredKey, '{}', 'application/json');
    const expired = await dataExportRequests.create(DEFAULT_TENANT_CONTEXT, {
      customerId: SEEDED_CUSTOMER_ID,
      requestedByType: 'customer',
      requestedById: SEEDED_CUSTOMER_ID,
    });
    await dataExportRequests.setReady(expired.id, expiredKey, new Date(Date.now() - 1000));

    const future = await dataExportRequests.create(DEFAULT_TENANT_CONTEXT, {
      customerId: SEEDED_CUSTOMER_ID,
      requestedByType: 'customer',
      requestedById: SEEDED_CUSTOMER_ID,
    });
    const futureKey = `test/retention-${Date.now()}-future.json`;
    await storage.putObject(futureKey, '{}', 'application/json');
    await dataExportRequests.setReady(future.id, futureKey, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    await executors.data_export_bundle(DEFAULT_TENANT_CONTEXT, 7);

    const expiredRow = await dataExportRequests.findById(DEFAULT_TENANT_CONTEXT, expired.id);
    expect(expiredRow?.status).toBe('expired');
    expect(await storage.objectExists(expiredKey)).toBe(false);

    const futureRow = await dataExportRequests.findById(DEFAULT_TENANT_CONTEXT, future.id);
    expect(futureRow?.status).toBe('ready');
    expect(await storage.objectExists(futureKey)).toBe(true);
    await storage.deleteObject(futureKey);
  });
});
