import 'dotenv/config';
import { eq } from 'drizzle-orm';
import type { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { customerAddresses, customerProfiles, documentVersions, documents, onboardingSessions } from '../../db/schema';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import { CustomersRepository } from '../customer/customers.repository';
import { CustomerAddressesRepository } from '../customer/customer-addresses.repository';
import { S3StorageProvider } from '../document/providers/s3-storage.provider';
import { OnboardingSessionsRepository } from '../onboarding/onboarding-sessions.repository';
import { OcrResultsRepository } from '../health-data/ocr-results.repository';
import { DeletionExecutor } from './deletion-executor';

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

// A dedicated THROWAWAY customer, never the shared SEEDED_CUSTOMER_ID fixture
// other e2e specs depend on matching by insured number — this test
// permanently anonymizes whichever customer it targets, by design.
describe('DeletionExecutor (integration)', () => {
  let pool: Pool;
  let executor: DeletionExecutor;
  let customers: CustomersRepository;
  let addresses: CustomerAddressesRepository;
  let onboardingSessionsRepo: OnboardingSessionsRepository;
  let ocrResultsRepo: OcrResultsRepository;
  let storage: S3StorageProvider;

  beforeAll(async () => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    customers = new CustomersRepository(db);
    addresses = new CustomerAddressesRepository(db);
    onboardingSessionsRepo = new OnboardingSessionsRepository(db);
    ocrResultsRepo = new OcrResultsRepository(db);
    storage = new S3StorageProvider(fakeConfig());
    await storage.onModuleInit();
    executor = new DeletionExecutor(db, storage);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('anonymizes the customer, hard-deletes addresses/profile, nulls session contact fields, and erases document storage objects', async () => {
    const db = createDatabase(pool);
    const customer = await customers.create(DEFAULT_TENANT_CONTEXT, {
      firstName: 'Throwaway',
      lastName: 'Testperson',
      email: 'throwaway@example.com',
      phone: '+49123456789',
      insuredNumber: `THROWAWAY-${Date.now()}`,
    });
    await addresses.create({ customerId: customer.id, label: 'Standard', strasse: 'Teststr. 1', plz: '12345', ort: 'Berlin', isDefault: true });

    const document = await db.insert(documents).values({ organizationId: DEFAULT_TENANT_CONTEXT.organizationId, type: 'prescription' }).returning();
    const documentId = document[0].id;
    await db.insert(documentVersions).values({
      documentId,
      storageKey: `test/${customer.id}-prescription.jpg`,
      hash: 'deadbeef',
      mimeType: 'image/jpeg',
      sizeBytes: 10,
    });
    await storage.putObject(`test/${customer.id}-prescription.jpg`, 'fake-bytes', 'image/jpeg');

    const session = await onboardingSessionsRepo.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);
    await onboardingSessionsRepo.claimToCustomer(DEFAULT_TENANT_CONTEXT, session.id, customer.id);
    await db
      .update(onboardingSessions)
      .set({ contactEmail: 'throwaway@example.com', contactPhone: '+49123456789', prescriptionDocumentId: documentId })
      .where(eq(onboardingSessions.id, session.id));

    await ocrResultsRepo.create(DEFAULT_TENANT_CONTEXT, {
      subjectType: 'onboarding_session',
      subjectId: session.id,
      documentId: null,
      patientName: 'Throwaway Testperson',
      patientDob: '01.01.1990',
      doctorName: 'Dr. Test',
      doctorLanr: null,
      diagnose: 'Test',
      hilfsmittel: 'Test',
      hilfsmittelNr: null,
      datum: '01.01.2026',
      confidence: {},
      rawEdited: false,
    });

    await executor.execute(customer.id);

    const anonymized = await customers.findById(DEFAULT_TENANT_CONTEXT, customer.id);
    expect(anonymized?.firstName).toBe('Gelöscht');
    expect(anonymized?.lastName).toBe('Gelöscht');
    expect(anonymized?.email).toBeNull();
    expect(anonymized?.phone).toBeNull();
    expect(anonymized?.insuredNumber).toBe(`GELOESCHT-${customer.id}`);

    const remainingAddresses = await db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customer.id));
    expect(remainingAddresses).toHaveLength(0);
    const remainingProfiles = await db.select().from(customerProfiles).where(eq(customerProfiles.customerId, customer.id));
    expect(remainingProfiles).toHaveLength(0);

    const [sessionRow] = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, session.id));
    expect(sessionRow.contactEmail).toBeNull();
    expect(sessionRow.contactPhone).toBeNull();
    expect(sessionRow.customerId).toBe(customer.id); // session row itself retained

    const [documentRow] = await db.select().from(documents).where(eq(documents.id, documentId));
    expect(documentRow.deletedAt).not.toBeNull();
    expect(await storage.objectExists(`test/${customer.id}-prescription.jpg`)).toBe(false);
  });
});
