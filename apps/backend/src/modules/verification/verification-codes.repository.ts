import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, lt, or, isNotNull, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { verificationCodes } from '../../db/schema';

@Injectable()
export class VerificationCodesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(target: string, purpose: string, codeHmac: string, expiresAt: Date) {
    const [row] = await this.db.insert(verificationCodes).values({ target, purpose, codeHmac, expiresAt }).returning();
    return row;
  }

  async findLatestActive(target: string, purpose: string) {
    const [row] = await this.db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.target, target),
          eq(verificationCodes.purpose, purpose),
          isNull(verificationCodes.consumedAt),
          gt(verificationCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(verificationCodes.createdAt))
      .limit(1);
    return row ?? null;
  }

  async incrementAttempts(id: string) {
    const [row] = await this.db
      .update(verificationCodes)
      .set({ attempts: sql`${verificationCodes.attempts} + 1` })
      .where(eq(verificationCodes.id, id))
      .returning();
    return row;
  }

  async consume(id: string) {
    await this.db.update(verificationCodes).set({ consumedAt: new Date() }).where(eq(verificationCodes.id, id));
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(verificationCodes).where(eq(verificationCodes.id, id)).limit(1);
    return row ?? null;
  }

  // Backs the periodic cleanup job (Principle 10) — purges rows that can
  // never be used again, whether because they expired unused or were
  // already consumed.
  async deleteExpired(): Promise<number> {
    const deleted = await this.db
      .delete(verificationCodes)
      .where(or(lt(verificationCodes.expiresAt, new Date()), isNotNull(verificationCodes.consumedAt)))
      .returning({ id: verificationCodes.id });
    return deleted.length;
  }
}
