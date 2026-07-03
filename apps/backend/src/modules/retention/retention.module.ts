import { Module } from '@nestjs/common';
import { DataExportRequestsRepository } from '../data-export/data-export-requests.repository';
import { DocumentModule } from '../document/document.module';
import { RetentionEnforcementJobHandler } from './jobs/retention-enforcement.job-handler';
import { RetentionPoliciesRepository } from './retention-policies.repository';

@Module({
  imports: [DocumentModule],
  // DataExportRequestsRepository is a leaf provider (DRIZZLE-only) —
  // registered directly rather than via a Nest-module import of
  // DataExportModule, which exports no providers today.
  providers: [RetentionPoliciesRepository, DataExportRequestsRepository, RetentionEnforcementJobHandler],
})
export class RetentionModule {}
