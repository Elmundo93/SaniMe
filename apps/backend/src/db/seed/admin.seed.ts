import 'dotenv/config';
import { hash } from 'bcrypt';
import { createDatabase, createPool } from '../client';
import { adminUsers } from '../schema';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';

// Dev/test-only bootstrap admin account, so the admin login endpoint is
// exercisable before Layer 3's real admin-user lifecycle management exists.
// No-ops silently if the env vars aren't set (e.g. in production).
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD nicht gesetzt — überspringe Admin-Seed.');
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist erforderlich');
  }
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);
  const passwordHash = await hash(password, 12);

  await db
    .insert(adminUsers)
    .values({ organizationId: DEFAULT_ORGANIZATION_ID, email, passwordHash })
    .onConflictDoNothing();

  await pool.end();
  console.log('Bootstrap-Admin geseedet:', email);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
