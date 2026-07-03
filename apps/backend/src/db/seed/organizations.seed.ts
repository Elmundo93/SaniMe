import 'dotenv/config';
import { createDatabase, createPool } from '../client';
import { organizations } from '../schema';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist erforderlich');
  }
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);

  await db
    .insert(organizations)
    .values({ id: DEFAULT_ORGANIZATION_ID, slug: 'default', name: 'SaniMe (Default)' })
    .onConflictDoNothing();

  await pool.end();
  console.log('Default-Organisation geseedet:', DEFAULT_ORGANIZATION_ID);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
