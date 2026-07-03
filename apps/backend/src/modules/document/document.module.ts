import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentVersionsRepository } from './document-versions.repository';
import { DocumentService } from './document.service';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsRepository } from './documents.repository';
import { STORAGE_PROVIDER } from './ports/storage-provider.port';
import { S3StorageProvider } from './providers/s3-storage.provider';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsRepository,
    DocumentVersionsRepository,
    DocumentService,
    { provide: STORAGE_PROVIDER, useClass: S3StorageProvider },
  ],
  exports: [DocumentService],
})
export class DocumentModule {}
