import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { AccessLogInterceptor } from '../common/audit/access-log.interceptor';
import { AuditRead } from '../common/audit/audit-read.decorator';
import { DEFAULT_TENANT_CONTEXT } from '../common/repository/tenant-context';
import { AdminJwtAuthGuard } from '../modules/auth/guards/admin-jwt-auth.guard';
import { AuditFixtureRepository } from './audit-fixture.repository';

// TEMPORARY — proves the @AuditRead()/AccessLogInterceptor mechanism end-to-end
// before any real sensitive-data read path exists. Delete once Layer 2's
// HealthData module provides a real @AuditRead()-decorated endpoint.
@Controller('_test/audit-fixture')
@UseGuards(AdminJwtAuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class AuditFixtureController {
  constructor(private readonly repository: AuditFixtureRepository) {}

  @Get()
  @AuditRead('test_resource')
  list() {
    return this.repository.listForTenant(DEFAULT_TENANT_CONTEXT);
  }
}
