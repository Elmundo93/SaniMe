import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { customerAddresses, customerProfiles, customers, documentVersions, documents, ocrResults, onboardingSessions } from '../../db/schema';
import { STORAGE_PROVIDER, type StorageProvider } from '../document/ports/storage-provider.port';

// Pseudonymize the identifying edge, retain the structural graph — a real
// tension, not hand-waved: audit_entries/order_status_events must stay
// intact as the compliance evidence trail itself, and German commercial/tax
// retention duties (HGB/AO) apply to billing-relevant supplies/orders.
// Hard-deleting `customers` would cascade-fail or orphan years of retained
// records. See work/Backendsprint.md Layer 4 / the approved plan's table:
//   customers                     -> anonymized in place, row+id survive
//   customer_addresses, _profiles -> hard-deleted
//   onboarding_sessions           -> retained, contact fields nulled
//   ocr_results, insurance_policies, supplies, orders, order_status_events,
//   consents, audit_entries, access_logs -> retained unchanged
//   documents/document_versions   -> storage object deleted, documents.deletedAt set
@Injectable()
export class DeletionExecutor {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async execute(customerId: string): Promise<void> {
    await this.eraseDocuments(customerId);

    await this.db
      .update(onboardingSessions)
      .set({ contactEmail: null, contactPhone: null, selectedAppointmentJson: null })
      .where(eq(onboardingSessions.customerId, customerId));

    await this.db.delete(customerAddresses).where(eq(customerAddresses.customerId, customerId));
    await this.db.delete(customerProfiles).where(eq(customerProfiles.customerId, customerId));

    await this.db
      .update(customers)
      .set({
        firstName: 'Gelöscht',
        lastName: 'Gelöscht',
        email: null,
        phone: null,
        // Never null — the column is NOT NULL — and must never re-match a
        // real archive lookup again, so it's keyed off the row's own id.
        insuredNumber: `GELOESCHT-${customerId}`,
      })
      .where(eq(customers.id, customerId));
  }

  private async eraseDocuments(customerId: string): Promise<void> {
    const sessions = await this.db.select().from(onboardingSessions).where(eq(onboardingSessions.customerId, customerId));
    const ocrRows = await this.db.select().from(ocrResults).where(eq(ocrResults.customerId, customerId));
    const documentIds = [
      ...sessions.flatMap((s) => [s.prescriptionDocumentId, s.insuranceCardDocumentId]),
      ...ocrRows.map((r) => r.documentId),
    ].filter((id): id is string => Boolean(id));

    for (const documentId of documentIds) {
      const versions = await this.db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId));
      for (const version of versions) {
        // Best-effort — an already-missing object must never block erasure.
        await this.storage.deleteObject(version.storageKey).catch(() => undefined);
      }
      await this.db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, documentId));
    }
  }
}
