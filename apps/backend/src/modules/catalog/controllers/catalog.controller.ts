import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { AnyPrincipalAuthGuard } from '../../auth/guards/any-principal-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { CatalogService } from '../catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('catalog/categories')
  @UseGuards(AnyPrincipalAuthGuard)
  listCategories() {
    return this.catalog.listCategories(DEFAULT_TENANT_CONTEXT);
  }

  @Get('products')
  @UseGuards(AnyPrincipalAuthGuard)
  listProducts() {
    return this.catalog.listProducts(DEFAULT_TENANT_CONTEXT);
  }

  @Get('products/:id')
  @UseGuards(AnyPrincipalAuthGuard)
  getProduct(@Param('id') id: string) {
    return this.catalog.getProduct(DEFAULT_TENANT_CONTEXT, id);
  }

  @Get('suppliers')
  @UseGuards(AdminJwtAuthGuard)
  listSuppliers() {
    return this.catalog.listSuppliers(DEFAULT_TENANT_CONTEXT);
  }
}
