import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { rolePermissions } from '../../db/schema';

// Schema-only for Layer 1: one row per (admin, permission). Full role
// differentiation (named roles, hierarchies) lands in Layer 4 — this only
// has to answer "does this admin hold permission X" from day 1.
@Injectable()
export class RolePermissionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async hasPermission(adminUserId: string, permission: string): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(rolePermissions)
      .where(and(eq(rolePermissions.adminUserId, adminUserId), eq(rolePermissions.permission, permission)))
      .limit(1);
    return Boolean(row);
  }
}
