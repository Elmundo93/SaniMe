import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { timelineEvents } from '../../db/schema';

@Injectable()
export class TimelineEventsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: { supplyId: string; label: string; description: string; completed: boolean; occurredAt: Date | null }) {
    const [row] = await this.db.insert(timelineEvents).values(input).returning();
    return row;
  }

  // Admin's manual "add a timeline note" action — kept as a sibling method
  // rather than widening create()'s signature, so the 60+ passing tests
  // exercising the system-authored path never have to change.
  async createAdminEntry(input: { supplyId: string; label: string; description: string }) {
    const [row] = await this.db
      .insert(timelineEvents)
      .values({ ...input, completed: true, occurredAt: new Date(), source: 'admin' })
      .returning();
    return row;
  }

  listForSupply(supplyId: string) {
    return this.db.select().from(timelineEvents).where(eq(timelineEvents.supplyId, supplyId));
  }
}
