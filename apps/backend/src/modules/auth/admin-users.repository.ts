import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { adminUsers } from '../../db/schema';

@Injectable()
export class AdminUsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string) {
    const [row] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return row ?? null;
  }
}
