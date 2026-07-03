import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const DOCUMENT_TYPES = [
  'prescription',
  'insurance_card',
  'approval',
  'cost_estimate',
  'delivery_note',
  'invoice',
  'handover_confirmation',
] as const;

export const DOCUMENT_STATUSES = ['pending_upload', 'uploaded', 'verified', 'rejected'] as const;

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  type: text('type').notNull(), // one of DOCUMENT_TYPES
  status: text('status').notNull().default('pending_upload'), // one of DOCUMENT_STATUSES
  currentVersionId: uuid('current_version_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// No public URLs are ever persisted here — storageKey is an internal object
// key, resolved to a short-lived presigned URL on demand by the controller.
export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  storageKey: text('storage_key').notNull(),
  hash: text('hash').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
