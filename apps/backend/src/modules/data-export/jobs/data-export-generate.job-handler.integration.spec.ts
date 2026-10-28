import 'dotenv/config';
import type { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../../db/client';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { ConsentsRepository } from '../../consents/consents.repository';
import { ConsentGrantsRepository } from '../../consents/consent-grants.repository';
import { S3StorageProvider } from '../../document/providers/s3-storage.provider';
import { InProcessJobQueue } from '../../job-queue/providers/in-process-job-queue.provider';
import { DataExportPayloadBuilder } from '../data-export-payload.builder';
import { DataExportRequestsRepository } from '../data-export-requests.repository';
import { DataExportGenerateJobHandler } from './data-export-generate.job-handler';

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

// Der Job läuft im Hintergrund (InProcessJobQueue) — auf sein Ergebnis warten
// statt eine feste Zeit zu schlafen; 200 ms reichten unter Last nicht.
async function waitForStatus<T extends { status: string }>(read: () => Promise<T | null>, status: string, timeoutMs = 10_000) {
  const ende = Date.now() + timeoutMs;
  let aktuell = await read();
  while (aktuell?.status !== status && Date.now() < ende) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    aktuell = await read();
  }
  return aktuell;
}

describe('DataExportGenerateJobHandler (integration)', () => {
  let pool: Pool;
  let requests: DataExportRequestsRepository;
  let storage: S3StorageProvider;
  let jobQueue: InProcessJobQueue;

  beforeAll(async () => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    requests = new DataExportRequestsRepository(db);
    storage = new S3StorageProvider(fakeConfig());
    await storage.onModuleInit();

    jobQueue = new InProcessJobQueue();
    const handler = new DataExportGenerateJobHandler(jobQueue, storage, requests, new DataExportPayloadBuilder(db, new ConsentsRepository(db), new ConsentGrantsRepository(db)));
    handler.onModuleInit();
  });

  afterAll(async () => {
    jobQueue.onModuleDestroy();
    await pool.end();
  });

  it('generates a bundle, uploads it, and marks the request ready with a working storage key', async () => {
    const created = await requests.create(DEFAULT_TENANT_CONTEXT, {
      customerId: SEEDED_CUSTOMER_ID,
      requestedByType: 'customer',
      requestedById: SEEDED_CUSTOMER_ID,
    });

    await jobQueue.enqueue('data-export.generate', { requestId: created.id });
    const after = await waitForStatus(() => requests.findById(DEFAULT_TENANT_CONTEXT, created.id), 'ready');
    expect(after?.status).toBe('ready');
    expect(after?.storageKey).toBe(`exports/${created.id}.json`);
    expect(after?.expiresAt).not.toBeNull();
    expect(await storage.objectExists(after!.storageKey!)).toBe(true);

    await storage.deleteObject(after!.storageKey!);
  });
});
