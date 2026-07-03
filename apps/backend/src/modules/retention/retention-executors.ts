import { and, eq, isNull, lt } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { onboardingSessions } from '../../db/schema';
import type { TenantContext } from '../../common/repository/tenant-context';
import type { StorageProvider } from '../document/ports/storage-provider.port';
import type { DataExportRequestsRepository } from '../data-export/data-export-requests.repository';

export type RetentionExecutor = (tenant: TenantContext, retentionDays: number) => Promise<void>;

export interface RetentionExecutorDeps {
  db: Database;
  storage: StorageProvider;
  dataExportRequests: DataExportRequestsRepository;
}

// Table, not switch — same idiom as TIMELINE_META/OPEN_ACTIONS_META. Built
// as a factory (not a plain static object) so executors can close over
// injected dependencies while the dispatch shape stays a lookup table.
export function createRetentionExecutors(deps: RetentionExecutorDeps): Record<string, RetentionExecutor> {
  return {
    // Anonymizes contact fields on onboarding sessions abandoned (never
    // completed) past retentionDays — leaves status/timestamps intact for
    // aggregate funnel analytics, matching the "anonymize" action, not delete.
    onboarding_session_abandoned: async (tenant, retentionDays) => {
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      await deps.db
        .update(onboardingSessions)
        .set({ contactEmail: null, contactPhone: null })
        .where(
          and(
            eq(onboardingSessions.organizationId, tenant.organizationId),
            isNull(onboardingSessions.completedAt),
            lt(onboardingSessions.updatedAt, cutoff),
          ),
        );
    },

    // retentionDays isn't used here — each row already carries its own
    // expiresAt (set to +7d at generation time, see
    // DataExportGenerateJobHandler), so this checks that directly rather
    // than re-deriving it from retentionDays. The policy row still exists to
    // declare the retention rule, even though enforcement reads a per-row
    // timestamp instead.
    data_export_bundle: async (tenant) => {
      const expired = await deps.dataExportRequests.listReadyExpiredBefore(new Date());
      for (const row of expired) {
        if (row.organizationId !== tenant.organizationId) continue;
        if (row.storageKey) {
          await deps.storage.deleteObject(row.storageKey).catch(() => undefined);
        }
        await deps.dataExportRequests.setExpired(row.id);
      }
    },
  };
}
