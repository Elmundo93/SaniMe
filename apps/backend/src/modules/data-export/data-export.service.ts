import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { TenantContext } from '../../common/repository/tenant-context';
import { STORAGE_PROVIDER, type StorageProvider } from '../document/ports/storage-provider.port';
import { JOB_QUEUE, type JobQueue } from '../job-queue/ports/job-queue.port';
import { DataExportRequestsRepository } from './data-export-requests.repository';

export interface RequestExportActor {
  type: 'customer' | 'admin';
  id: string;
}

@Injectable()
export class DataExportService {
  constructor(
    private readonly requests: DataExportRequestsRepository,
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async requestExport(tenant: TenantContext, customerId: string, actor: RequestExportActor) {
    const row = await this.requests.create(tenant, { customerId, requestedByType: actor.type, requestedById: actor.id });
    await this.jobQueue.enqueue('data-export.generate', { requestId: row.id });
    return row;
  }

  // actorCustomerId: null means unrestricted (admin); a customerId
  // restricts the read to that customer's own export requests — same
  // resolveOwnerFilter convention as SupplyOrderService.
  async getExport(tenant: TenantContext, id: string, actorCustomerId: string | null = null) {
    const row = await this.requests.findById(tenant, id);
    if (!row) {
      throw new NotFoundException('Export-Anfrage nicht gefunden');
    }
    if (actorCustomerId !== null && row.customerId !== actorCustomerId) {
      throw new ForbiddenException('Kein Zugriff auf diese Export-Anfrage');
    }
    // Generated on demand, never persisted — same rule as document downloads.
    const downloadUrl = row.status === 'ready' && row.storageKey ? await this.storage.createPresignedDownload(row.storageKey) : null;
    return { ...row, downloadUrl };
  }
}
