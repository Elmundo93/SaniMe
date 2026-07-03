import 'dotenv/config';
import { createDatabase, createPool } from '../client';
import { retentionPolicies } from '../schema';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';

// Deliberately excludes audit_entries/access_logs — auto-deleting those
// would undermine the audit trail Layer 4 exists to provide; retain
// indefinitely until a specific legal retention ceiling is confirmed.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist erforderlich');
  }
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);

  await db
    .insert(retentionPolicies)
    .values([
      {
        organizationId: DEFAULT_ORGANIZATION_ID,
        resourceType: 'onboarding_session_abandoned',
        retentionDays: 90,
        action: 'anonymize',
      },
      {
        organizationId: DEFAULT_ORGANIZATION_ID,
        resourceType: 'data_export_bundle',
        retentionDays: 7,
        action: 'delete',
      },
    ])
    .onConflictDoNothing();

  await pool.end();
  console.log('Retention-Policies geseedet.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
