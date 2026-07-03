import { BadRequestException, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentCustomerSession } from '../../auth/decorators/current-customer-session.decorator';
import { CustomerSessionAuthGuard } from '../../auth/guards/customer-session-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { DataExportService } from '../data-export.service';

@Controller('me/data-export')
@UseGuards(CustomerSessionAuthGuard)
export class MeDataExportController {
  constructor(private readonly dataExport: DataExportService) {}

  @Post()
  request(@CurrentCustomerSession() session: { customerId: string | null }) {
    if (!session.customerId) {
      throw new BadRequestException('Diese Sitzung ist noch keinem Kunden zugeordnet');
    }
    return this.dataExport.requestExport(DEFAULT_TENANT_CONTEXT, session.customerId, { type: 'customer', id: session.customerId });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentCustomerSession() session: { customerId: string | null }) {
    if (!session.customerId) {
      throw new BadRequestException('Diese Sitzung ist noch keinem Kunden zugeordnet');
    }
    return this.dataExport.getExport(DEFAULT_TENANT_CONTEXT, id, session.customerId);
  }
}
