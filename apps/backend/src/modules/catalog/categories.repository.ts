import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { catalogCategories } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class CategoriesRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  listAll(tenant: TenantContext) {
    return this.db.select().from(catalogCategories).where(this.tenantFilter(catalogCategories.organizationId, tenant));
  }

  listActive(tenant: TenantContext) {
    return this.db
      .select()
      .from(catalogCategories)
      .where(and(this.tenantFilter(catalogCategories.organizationId, tenant), eq(catalogCategories.isActive, true)))
      .orderBy(asc(catalogCategories.sortOrder), asc(catalogCategories.name));
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(catalogCategories)
      .where(and(this.tenantFilter(catalogCategories.organizationId, tenant), eq(catalogCategories.id, id)))
      .limit(1);
    return row ?? null;
  }

  // Bedarfe referenzieren Kategorien über slug (@sanime/domain's BEDARF_KATALOG).
  findBySlugs(tenant: TenantContext, slugs: string[]) {
    if (slugs.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(catalogCategories)
      .where(
        and(
          this.tenantFilter(catalogCategories.organizationId, tenant),
          eq(catalogCategories.isActive, true),
          inArray(catalogCategories.slug, slugs),
        ),
      );
  }

  // Used by GET /products?krankheitsbildId= and /qa — a Krankheitsbild
  // (see @sanime/domain's KRANKHEITSBILD_KATALOG) can be tagged onto more
  // than one category, hence a list rather than a single row.
  findByKrankheitsbildId(tenant: TenantContext, krankheitsbildId: string) {
    return this.db
      .select()
      .from(catalogCategories)
      .where(
        and(
          this.tenantFilter(catalogCategories.organizationId, tenant),
          eq(catalogCategories.isActive, true),
          eq(catalogCategories.krankheitsbildId, krankheitsbildId),
        ),
      );
  }

  /** Die übergebenen Kategorien plus deren aktive Unterkategorien — eine
   * Hauptkategorie steht für alles darunter (max. zwei Ebenen, daher eine Stufe). */
  async expandWithChildren(tenant: TenantContext, ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const children = await this.db
      .select({ id: catalogCategories.id })
      .from(catalogCategories)
      .where(
        and(
          this.tenantFilter(catalogCategories.organizationId, tenant),
          eq(catalogCategories.isActive, true),
          inArray(catalogCategories.parentId, ids),
        ),
      );
    return [...new Set([...ids, ...children.map((c) => c.id)])];
  }
}
