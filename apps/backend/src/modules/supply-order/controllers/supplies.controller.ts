import { Controller, Get, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { AccessLogInterceptor } from '../../../common/audit/access-log.interceptor';
import { AuditRead } from '../../../common/audit/audit-read.decorator';
import { CurrentPrincipal, resolveOwnerFilter, type CurrentPrincipalInfo } from '../../auth/decorators/current-principal.decorator';
import { AnyPrincipalAuthGuard } from '../../auth/guards/any-principal-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { SupplyOrderService } from '../supply-order.service';

@Controller('supplies')
@UseGuards(AnyPrincipalAuthGuard)
export class SuppliesController {
  constructor(private readonly supplyOrder: SupplyOrderService) {}

  @Get()
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('supply')
  list(@CurrentPrincipal() principal: CurrentPrincipalInfo | null) {
    return this.supplyOrder.listSupplies(DEFAULT_TENANT_CONTEXT, resolveOwnerFilter(principal));
  }

  @Get(':id')
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('supply')
  getById(@Param('id') id: string, @CurrentPrincipal() principal: CurrentPrincipalInfo | null) {
    return this.supplyOrder.getSupply(DEFAULT_TENANT_CONTEXT, id, resolveOwnerFilter(principal));
  }
}
