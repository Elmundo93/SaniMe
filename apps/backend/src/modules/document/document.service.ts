import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { TenantContext } from '../../common/repository/tenant-context';
import { DocumentVersionsRepository } from './document-versions.repository';
import { DocumentsRepository } from './documents.repository';
import { STORAGE_PROVIDER, type StorageProvider } from './ports/storage-provider.port';
import { DOCUMENT_TYPES, DOCUMENT_STATUSES } from '../../db/schema/documents.schema';

@Injectable()
export class DocumentService {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly documents: DocumentsRepository,
    private readonly versions: DocumentVersionsRepository,
  ) {}

  createUploadUrl(mimeType: string) {
    return this.storage.createPresignedUpload(mimeType);
  }

  async registerDocument(
    tenant: TenantContext,
    input: { type: string; storageKey: string; hash: string; mimeType: string; sizeBytes: number },
  ) {
    if (!DOCUMENT_TYPES.includes(input.type as (typeof DOCUMENT_TYPES)[number])) {
      throw new BadRequestException(`Unbekannter Dokumenttyp: ${input.type}`);
    }
    const exists = await this.storage.objectExists(input.storageKey);
    if (!exists) {
      throw new BadRequestException('Objekt wurde nicht im Storage gefunden — Upload zuerst abschließen');
    }

    const document = await this.documents.create(tenant, input.type);
    const version = await this.versions.create(document.id, input.storageKey, input.hash, input.mimeType, input.sizeBytes);
    await this.documents.setCurrentVersion(tenant, document.id, version.id);
    return { ...document, currentVersionId: version.id, status: 'uploaded' };
  }

  async getDocument(tenant: TenantContext, id: string) {
    const document = await this.documents.findById(tenant, id);
    if (!document) {
      throw new NotFoundException('Dokument nicht gefunden');
    }
    let downloadUrl: string | null = null;
    if (document.currentVersionId) {
      const version = await this.versions.findById(document.currentVersionId);
      if (version) {
        downloadUrl = await this.storage.createPresignedDownload(version.storageKey);
      }
    }
    return { ...document, downloadUrl };
  }

  async setStatus(tenant: TenantContext, id: string, status: string) {
    if (!DOCUMENT_STATUSES.includes(status as (typeof DOCUMENT_STATUSES)[number])) {
      throw new BadRequestException(`Unbekannter Status: ${status}`);
    }
    const document = await this.documents.findById(tenant, id);
    if (!document) {
      throw new NotFoundException('Dokument nicht gefunden');
    }
    await this.documents.setStatus(tenant, id, status);
    return { ...document, status };
  }
}
