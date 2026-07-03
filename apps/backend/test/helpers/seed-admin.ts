import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE, type Database } from '../../src/db/client';
import { adminUsers, rolePermissions } from '../../src/db/schema';
import { DEFAULT_TENANT_CONTEXT } from '../../src/common/repository/tenant-context';
import type { Permission } from '../../src/modules/auth/permissions';

// RolesGuard queries role_permissions by a real admin_users.id (a uuid
// column, not a plain string) — signing a JWT with an arbitrary sub like
// 'test-admin' no longer works once a route is @Roles(...)-gated. Seeds a
// real admin with exactly the given permissions and returns a token for it.
export async function seedAdminWithPermissions(app: INestApplication, permissions: Permission[]): Promise<{ id: string; token: string }> {
  const db: Database = app.get(DRIZZLE);
  const [admin] = await db
    .insert(adminUsers)
    .values({ organizationId: DEFAULT_TENANT_CONTEXT.organizationId, email: `test-admin-${Math.random()}@example.com`, passwordHash: 'unused' })
    .returning();

  if (permissions.length > 0) {
    await db.insert(rolePermissions).values(permissions.map((permission) => ({
      organizationId: DEFAULT_TENANT_CONTEXT.organizationId,
      adminUserId: admin.id,
      permission,
    })));
  }

  const jwt = app.get(JwtService);
  const token = await jwt.signAsync({ sub: admin.id, email: admin.email }, { secret: process.env.ADMIN_JWT_SECRET, expiresIn: '5m' });
  return { id: admin.id, token };
}
