import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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

  listActive(tenant: TenantContext) {
    return this.db
      .select(PRODUCT_COLUMNS)
      .from(products)
      .innerJoin(catalogCategories, eq(products.categoryId, catalogCategories.id))
      .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(and(this.tenantFilter(products.organizationId, tenant), eq(products.isActive, true)));
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

    const offers = await this.db
      .select({
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        deliveryTimeDays: supplierProducts.deliveryTimeDays,
        customerCopayCents: supplierProducts.customerCopayCents,
        availability: supplierProducts.availability,
      })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .where(and(eq(supplierProducts.productId, id), eq(supplierProducts.isActive, true)));

    return { ...product, offers };
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
