import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesRepository } from './categories.repository';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogService } from './catalog.service';
import { ProductsRepository } from './products.repository';
import { SuppliersRepository } from './suppliers.repository';

@Module({
  imports: [AuthModule],
  controllers: [CatalogController],
  providers: [CategoriesRepository, ProductsRepository, SuppliersRepository, CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
