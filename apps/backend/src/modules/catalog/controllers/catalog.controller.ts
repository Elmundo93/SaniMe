import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { AnyPrincipalAuthGuard } from '../../auth/guards/any-principal-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { CatalogService } from '../catalog.service';
import { toProdukt } from '../catalog.mapper';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('catalog/categories')
  @UseGuards(AnyPrincipalAuthGuard)
  listCategories() {
    return this.catalog.listCategories(DEFAULT_TENANT_CONTEXT);
  }

  // Mapped to @sanime/domain's Produkt shape (not the raw joined repository
  // row) — this is what the app's /katalog browse screen and the onboarding
  // event payloads both expect.
  @Get('products')
  @UseGuards(AnyPrincipalAuthGuard)
  async listProducts(@Query('categoryId') categoryId?: string, @Query('q') q?: string) {
    const products = await this.catalog.listProducts(DEFAULT_TENANT_CONTEXT, { categoryId, query: q });
    return products.map(toProdukt);
  }

  @Get('products/:id')
  @UseGuards(AnyPrincipalAuthGuard)
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
