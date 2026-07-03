import { Injectable, NotFoundException } from '@nestjs/common';
import type { TenantContext } from '../../common/repository/tenant-context';
import { CategoriesRepository } from './categories.repository';
import { ProductsRepository } from './products.repository';
import { SuppliersRepository } from './suppliers.repository';

@Injectable()
export class CatalogService {
  constructor(
    private readonly categories: CategoriesRepository,
    private readonly products: ProductsRepository,
    private readonly suppliers: SuppliersRepository,
  ) {}

  listCategories(tenant: TenantContext) {
    return this.categories.listAll(tenant);
  }

  listProducts(tenant: TenantContext) {
    return this.products.listActive(tenant);
  }

  async getProduct(tenant: TenantContext, id: string) {
    const product = await this.products.findById(tenant, id);
    if (!product) {
      throw new NotFoundException('Produkt nicht gefunden');
    }
    return product;
  }

  // Used by Onboarding/Supply-Order to validate a customer's product
  // selection actually exists for this tenant before persisting it.
  async assertProductExists(tenant: TenantContext, id: string) {
    const product = await this.products.findRawById(tenant, id);
    if (!product) {
      throw new NotFoundException('Produkt nicht gefunden');
    }
    return product;
  }

  listSuppliers(tenant: TenantContext) {
    return this.suppliers.listAll(tenant);
  }

  // Thin delegates for the Appointment module — Catalog keeps owning
  // suppliers/supplier_products, Appointment never imports the repositories
  // directly (same "modules export only their Service" discipline as Admin).
  async getSupplier(tenant: TenantContext, id: string) {
    const supplier = await this.suppliers.findById(tenant, id);
    if (!supplier) {
      throw new NotFoundException('Lieferant nicht gefunden');
    }
    return supplier;
  }

  async getSupplierProduct(tenant: TenantContext, supplierId: string, productId: string) {
    const supplierProduct = await this.products.findSupplierProduct(tenant, supplierId, productId);
    if (!supplierProduct) {
      throw new NotFoundException('Lieferant bietet dieses Produkt nicht an');
    }
    return supplierProduct;
  }
}
