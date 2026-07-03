import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentModule } from '../document/document.module';
import { AdminDeletionRequestsController } from './controllers/admin-deletion-requests.controller';
import { MeDeletionRequestsController } from './controllers/me-deletion-requests.controller';
import { DeletionExecutor } from './deletion-executor';
import { DeletionRequestsRepository } from './deletion-requests.repository';
import { DeletionRequestsService } from './deletion-requests.service';
import { DeletionExecuteJobHandler } from './jobs/deletion-execute.job-handler';

@Module({
  imports: [AuthModule, DocumentModule],
  controllers: [MeDeletionRequestsController, AdminDeletionRequestsController],
  providers: [DeletionRequestsRepository, DeletionExecutor, DeletionRequestsService, DeletionExecuteJobHandler],
})
export class DeletionRequestsModule {}
