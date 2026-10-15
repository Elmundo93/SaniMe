import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { catalogCategories, manufacturers, products, supplierProducts, suppliers } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

const PRODUCT_COLUMNS = {
  id: products.id,
  name: products.name,
  description: products.description,
  hilfsmittelnummer: products.hilfsmittelnummer,
  features: products.features,
  requiresApproval: products.requiresApproval,
  categoryName: catalogCategories.name,
  manufacturerName: manufacturers.name,
};

@Injectable()
export class ProductsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async listActive(tenant: TenantContext, filters?: { categoryId?: string; categoryIds?: string[]; query?: string }) {
    const conditions = [this.tenantFilter(products.organizationId, tenant), eq(products.isActive, true)];
    if (filters?.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
    // Used by CatalogService.listProductsForKrankheitsbild — a Krankheitsbild
    // can map to more than one category.
    if (filters?.categoryIds && filters.categoryIds.length > 0) {
      conditions.push(inArray(products.categoryId, filters.categoryIds));
    }
    if (filters?.query) {
      conditions.push(or(ilike(products.name, `%${filters.query}%`), ilike(products.description, `%${filters.query}%`))!);
    }
    const rows = await this.db
      .select(PRODUCT_COLUMNS)
      .from(products)
      .innerJoin(catalogCategories, eq(products.categoryId, catalogCategories.id))
      .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(and(...conditions));
    if (rows.length === 0) return [];

    // Offers for all listed products in one query (no N+1) — without them
    // toProdukt() would show every product as "Kein Eigenanteil" in the
    // catalog and in Krankheitsbild recommendations.
    const offers = await this.selectOffers(inArray(supplierProducts.productId, rows.map((r) => r.id)));
    return rows.map((row) => ({ ...row, offers: offers.filter((o) => o.productId === row.id) }));
  }

  async findById(tenant: TenantContext, id: string) {
    const [product] = await this.db
      .select(PRODUCT_COLUMNS)
      .from(products)
      .innerJoin(catalogCategories, eq(products.categoryId, catalogCategories.id))
      .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(and(this.tenantFilter(products.organizationId, tenant), eq(products.id, id)))
      .limit(1);
    if (!product) return null;

    const offers = await this.selectOffers(eq(supplierProducts.productId, id));
    return { ...product, offers };
  }

  private selectOffers(productFilter: SQL) {
    return this.db
      .select({
        id: supplierProducts.id,
        productId: supplierProducts.productId,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        deliveryTimeDays: supplierProducts.deliveryTimeDays,
        customerCopayCents: supplierProducts.customerCopayCents,
        availability: supplierProducts.availability,
      })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .where(and(productFilter, eq(supplierProducts.isActive, true)));
  }

  // Used by Onboarding/Supply-Order to validate a selection exists, without
  // paying for the display-oriented joins above.
  async findRawById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(this.tenantFilter(products.organizationId, tenant), eq(products.id, id)))
      .limit(1);
    return row ?? null;
  }

  // Used by Appointment's SupplierCalendarService to anchor the earliest
  // proposable day off the real deliveryTimeDays for the pair, replacing the
  // client mock's regex-parsed free-text lieferzeit.
  async findSupplierProduct(tenant: TenantContext, supplierId: string, productId: string) {
    const [row] = await this.db
      .select()
      .from(supplierProducts)
      .where(
        and(
          this.tenantFilter(supplierProducts.organizationId, tenant),
          eq(supplierProducts.supplierId, supplierId),
          eq(supplierProducts.productId, productId),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}
