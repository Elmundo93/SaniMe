import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnyPrincipalAuthGuard } from '../../auth/guards/any-principal-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { SupplyOrderService } from '../supply-order.service';

@Controller('supplies')
@UseGuards(AnyPrincipalAuthGuard)
export class SuppliesController {
  constructor(private readonly supplyOrder: SupplyOrderService) {}

  @Get()
  list() {
    return this.supplyOrder.listSupplies(DEFAULT_TENANT_CONTEXT);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.supplyOrder.getSupply(DEFAULT_TENANT_CONTEXT, id);
  }
}
