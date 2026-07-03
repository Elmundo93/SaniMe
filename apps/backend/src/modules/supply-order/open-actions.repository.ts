import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { openActions, supplies } from '../../db/schema';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class OpenActionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: { supplyId: string; title: string; description: string; actionType: string }) {
    const [row] = await this.db.insert(openActions).values(input).returning();
    return row;
  }

  listForSupply(supplyId: string) {
    return this.db.select().from(openActions).where(eq(openActions.supplyId, supplyId));
  }

  async resolve(id: string) {
    await this.db.update(openActions).set({ resolvedAt: new Date() }).where(eq(openActions.id, id));
  }

  // openActions has no organizationId of its own — tenant scoping goes
  // through the supplies join, oldest-first so the admin inbox surfaces the
  // longest-waiting item first.
  listOpenForInbox(tenant: TenantContext) {
    return this.db
      .select({
        id: openActions.id,
        supplyId: openActions.supplyId,
        title: openActions.title,
        description: openActions.description,
        actionType: openActions.actionType,
        createdAt: openActions.createdAt,
      })
      .from(openActions)
      .innerJoin(supplies, eq(openActions.supplyId, supplies.id))
      .where(and(eq(supplies.organizationId, tenant.organizationId), isNull(openActions.resolvedAt)))
      .orderBy(asc(openActions.createdAt));
  }
}
