import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '../../db/client';
import { orderStatusEvents } from '../../db/schema';

export interface RecordOrderStatusEventInput {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  eventType: string;
  actorType: 'customer' | 'admin' | 'system';
  actorId: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class OrderStatusEventsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async record(input: RecordOrderStatusEventInput) {
    await this.db.insert(orderStatusEvents).values({ ...input, metadata: input.metadata ?? {} });
  }
}
