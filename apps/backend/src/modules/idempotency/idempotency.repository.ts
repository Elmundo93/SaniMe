import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { idempotencyKeys, type IdempotencyKeyRow } from '../../db/schema';

@Injectable()
export class IdempotencyRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByKey(key: string): Promise<IdempotencyKeyRow | null> {
    const [row] = await this.db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key)).limit(1);
    return row ?? null;
  }

  async create(key: string, requestHash: string) {
    await this.db.insert(idempotencyKeys).values({ key, requestHash }).onConflictDoNothing();
  }

  async storeResponse(key: string, responseStatus: number, responseBody: unknown) {
    await this.db
      .update(idempotencyKeys)
      .set({ responseStatus, responseBody: responseBody as object })
      .where(eq(idempotencyKeys.key, key));
  }
}
