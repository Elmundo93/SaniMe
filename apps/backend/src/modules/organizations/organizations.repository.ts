import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { organizations } from '../../db/schema';

// Not tenant-scoped like other repositories — this repository IS the tenant
// table, so a `tenantFilter()` on itself would be circular.
@Injectable()
export class OrganizationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string) {
    const [row] = await this.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string) {
    const [row] = await this.db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
    return row ?? null;
  }
}
