import 'dotenv/config';
import { createDatabase, createPool } from '../client';
import { customerAddresses, customers } from '../schema';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';

// Fixture-only dev/e2e data, clearly marked as such — mirrors
// lib/mockKundenArchiv.ts's MOCK_ARCHIV entry so e2e tests can exercise the
// same "returning customer" scenario the client currently mocks. Never
// seeded outside local dev/test (this script is not part of any production
// deploy path).
const CUSTOMER_ID = '50000000-0000-0000-0000-000000000001';
const ADDRESS_ID = '50000000-0000-0000-0000-000000000002';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist erforderlich');
  }
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);

  await db
    .insert(customers)
    .values({
      id: CUSTOMER_ID,
      organizationId: DEFAULT_ORGANIZATION_ID,
      firstName: 'Max',
      lastName: 'Mustermann',
      phone: '+49 151 00000000',
      insuredNumber: 'A123456789',
    })
    .onConflictDoNothing();

  await db
    .insert(customerAddresses)
    .values({
      id: ADDRESS_ID,
      customerId: CUSTOMER_ID,
      label: 'Standard',
      strasse: 'Musterstraße 12',
      plz: '12345',
      ort: 'Berlin',
      isDefault: true,
    })
    .onConflictDoNothing();

  await pool.end();
  console.log('Fixture-Kunde geseedet:', CUSTOMER_ID);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
