import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { orderNotes } from '../../db/schema';

@Injectable()
export class OrderNotesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: { orderId: string; authorAdminId: string; body: string }) {
    const [row] = await this.db.insert(orderNotes).values(input).returning();
    return row;
  }

  listForOrder(orderId: string) {
    return this.db.select().from(orderNotes).where(eq(orderNotes.orderId, orderId)).orderBy(asc(orderNotes.createdAt));
  }
}
