import 'dotenv/config';
import { randomUUID } from 'crypto';
import type { ConfigService } from '@nestjs/config';
import { S3StorageProvider } from './s3-storage.provider';

// Runs against the real docker-compose MinIO — same instance
// documents.e2e-spec.ts already proves createPresignedUpload/objectExists/
// createPresignedDownload against. This covers the two Layer 4 additions:
// server-generated writes (data export bundles) and deletes (erasure).
function fakeConfig(): ConfigService {
  const env = process.env as Record<string, string | undefined>;
  // AWS SDK's forcePathStyle needs a real boolean — the real ConfigService
  // (backed by the zod-validated env schema) already returns typed values;
  // this fake must coerce the raw string itself.
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

describe('S3StorageProvider (integration)', () => {
  let provider: S3StorageProvider;

  beforeAll(async () => {
    provider = new S3StorageProvider(fakeConfig());
    await provider.onModuleInit();
  });

  it('putObject writes an object that objectExists then finds, and deleteObject removes it', async () => {
    const key = `test/${randomUUID()}.json`;
    expect(await provider.objectExists(key)).toBe(false);

    await provider.putObject(key, JSON.stringify({ hello: 'world' }), 'application/json');
    expect(await provider.objectExists(key)).toBe(true);

    await provider.deleteObject(key);
    expect(await provider.objectExists(key)).toBe(false);
  });

  it('putObject is overwrite-idempotent for the same key', async () => {
    const key = `test/${randomUUID()}.json`;
    await provider.putObject(key, 'first', 'text/plain');
    await provider.putObject(key, 'second', 'text/plain');
    expect(await provider.objectExists(key)).toBe(true);
    await provider.deleteObject(key);
  });
});
