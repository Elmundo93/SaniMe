import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { adminUsers } from '../../db/schema';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class AdminUsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string) {
    const [row] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return row ?? null;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    return row ?? null;
  }

  // Für Zuweisungen und Anzeigenamen — nur aktive Personen, ohne Geheimnisse.
  listActive(tenant: TenantContext) {
    return this.db
      .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name })
      .from(adminUsers)
      .where(and(eq(adminUsers.organizationId, tenant.organizationId), isNull(adminUsers.deactivatedAt)))
      .orderBy(asc(adminUsers.name), asc(adminUsers.email));
  }

  async setTotpSecret(id: string, totpSecretEncrypted: string) {
    await this.db.update(adminUsers).set({ totpSecretEncrypted, totpActivatedAt: null }).where(eq(adminUsers.id, id));
  }

  async activateTotp(id: string) {
    await this.db.update(adminUsers).set({ totpActivatedAt: new Date() }).where(eq(adminUsers.id, id));
  }

  async recordLogin(id: string) {
    await this.db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
  }
}
