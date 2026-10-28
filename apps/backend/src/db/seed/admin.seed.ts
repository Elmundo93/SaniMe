import 'dotenv/config';
import { hash } from 'bcrypt';
import { createDatabase, createPool } from '../client';
import { adminUsers, rolePermissions } from '../schema';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';
import { PERMISSIONS } from '../../modules/auth/permissions';

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
    // Anzeigename in der Admin-App; ohne SEED_ADMIN_NAME zeigt sie die E-Mail.
    .values({ organizationId: DEFAULT_ORGANIZATION_ID, email, passwordHash, name: process.env.SEED_ADMIN_NAME ?? '' })
    .onConflictDoNothing();

  // Layer 4: backfill every permission to every existing admin, not just a
  // newly-inserted one — role_permissions had zero runtime consumers before
  // RolesGuard started actually gating routes, so no admin ever had a row.
  // Re-running this seed is a safe, idempotent upgrade path for existing
  // dev/staging DBs (no super-admin bypass exists — see permissions.ts).
  const admins = await db.select({ id: adminUsers.id, organizationId: adminUsers.organizationId }).from(adminUsers);
  if (admins.length > 0) {
    const grants = admins.flatMap((admin) =>
      PERMISSIONS.map((permission) => ({ organizationId: admin.organizationId, adminUserId: admin.id, permission })),
    );
    await db.insert(rolePermissions).values(grants).onConflictDoNothing();
  }

  await pool.end();
  console.log('Bootstrap-Admin geseedet:', email);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
