import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../../db/client';

@Injectable()
export class DrizzleHealthIndicator extends HealthIndicator {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`select 1`);
      return this.getStatus(key, true);
    } catch (error) {
      const status = this.getStatus(key, false, {
        message: error instanceof Error ? error.message : 'unknown error',
      });
      throw new HealthCheckError('Datenbankverbindung fehlgeschlagen', status);
    }
  }
}
