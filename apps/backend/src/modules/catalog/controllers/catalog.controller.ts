import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { CatalogService } from '../catalog.service';
import { toProdukt } from '../catalog.mapper';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // The three catalog reads below are deliberately public: /katalog is
  // browsable before any onboarding session exists (browsing never calls
  // starten()), and they expose only catalog data — no health/customer data.
  // Categories are trimmed to {id, name} so no tenant internals leak.
  @Get('catalog/categories')
  async listCategories() {
    const categories = await this.catalog.listCategories(DEFAULT_TENANT_CONTEXT);
    return categories.map((c) => ({ id: c.id, name: c.name }));
  }

  // Mapped to @sanime/domain's Produkt shape (not the raw joined repository
  // row) — this is what the app's /katalog browse screen and the onboarding
  // event payloads both expect.
  @Get('products')
  async listProducts(@Query('categoryId') categoryId?: string, @Query('q') q?: string) {
    const products = await this.catalog.listProducts(DEFAULT_TENANT_CONTEXT, { categoryId, query: q });
    return products.map(toProdukt);
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    const product = await this.catalog.getProduct(DEFAULT_TENANT_CONTEXT, id);
    return toProdukt(product);
  }

  @Get('suppliers')
  @UseGuards(AdminJwtAuthGuard)
  listSuppliers() {
    return this.catalog.listSuppliers(DEFAULT_TENANT_CONTEXT);
  }
}
