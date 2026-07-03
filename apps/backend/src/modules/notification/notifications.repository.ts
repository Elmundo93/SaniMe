import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { notifications, type NewNotification } from '../../db/schema';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: Omit<NewNotification, 'id' | 'status' | 'createdAt' | 'sentAt' | 'failureReason'>) {
    const [row] = await this.db.insert(notifications).values({ ...input, status: 'pending' }).returning();
    return row;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return row ?? null;
  }

  async markSent(id: string) {
    await this.db.update(notifications).set({ status: 'sent', sentAt: new Date() }).where(eq(notifications.id, id));
  }

  async markFailed(id: string, reason: string) {
    await this.db.update(notifications).set({ status: 'failed', failureReason: reason }).where(eq(notifications.id, id));
  }
}
