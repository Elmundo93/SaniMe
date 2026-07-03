import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentsRepository } from '../consents/consents.repository';
import { DocumentModule } from '../document/document.module';
import { AdminDataExportController } from './controllers/admin-data-export.controller';
import { MeDataExportController } from './controllers/me-data-export.controller';
import { DataExportPayloadBuilder } from './data-export-payload.builder';
import { DataExportRequestsRepository } from './data-export-requests.repository';
import { DataExportService } from './data-export.service';
import { DataExportGenerateJobHandler } from './jobs/data-export-generate.job-handler';

@Module({
  imports: [AuthModule, DocumentModule],
  controllers: [MeDataExportController, AdminDataExportController],
  providers: [
    DataExportRequestsRepository,
    ConsentsRepository,
    DataExportPayloadBuilder,
    DataExportService,
    DataExportGenerateJobHandler,
  ],
})
export class DataExportModule {}
