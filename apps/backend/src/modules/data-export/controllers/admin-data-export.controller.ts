import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { DataExportService } from '../data-export.service';

@Controller('admin')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminDataExportController {
  constructor(private readonly dataExport: DataExportService) {}

  @Post('customers/:customerId/data-export')
  @Roles('compliance:manage')
  request(@Param('customerId') customerId: string, @CurrentAdmin() admin: { id: string }) {
    return this.dataExport.requestExport(DEFAULT_TENANT_CONTEXT, customerId, { type: 'admin', id: admin.id });
  }

  @Get('data-export/:id')
  @Roles('compliance:read')
  get(@Param('id') id: string) {
    return this.dataExport.getExport(DEFAULT_TENANT_CONTEXT, id);
  }
}
