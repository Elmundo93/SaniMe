import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { pushTokens } from '../../db/schema';

@Injectable()
export class PushTokensRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Upsert über das Token: dasselbe Gerät mit einem anderen Kunden gehört ab
  // jetzt diesem — sonst bekäme der vorherige Kunde fremde Nachrichten.
  async speichern(customerId: string, token: string, platform: string) {
    await this.db
      .insert(pushTokens)
      .values({ customerId, token, platform })
      .onConflictDoUpdate({ target: pushTokens.token, set: { customerId, platform, updatedAt: new Date() } });
  }

  async entfernen(token: string) {
    await this.db.delete(pushTokens).where(eq(pushTokens.token, token));
  }

  async entfernenFuerKunde(customerId: string) {
    await this.db.delete(pushTokens).where(eq(pushTokens.customerId, customerId));
  }

  listForCustomer(customerId: string) {
    return this.db.select().from(pushTokens).where(eq(pushTokens.customerId, customerId));
  }
}
