import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.schema';
import { organizations } from './organizations.schema';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  recipientType: text('recipient_type').notNull(), // 'customer' | 'admin'
  recipientId: text('recipient_id'),
  channel: text('channel').notNull(), // 'push' | 'email'
  target: text('target').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  // Nur Verweise für die App (z. B. supplyId zum Öffnen der Versorgung) —
  // landet im Push-Payload, also nie Gesundheitsdaten.
  data: jsonb('data').notNull().default({}),
  status: text('status').notNull().default('pending'), // 'pending' | 'sent' | 'failed'
  failureReason: text('failure_reason'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// APNs-/FCM-Gerätetoken eines Kunden. Ein Token gehört immer genau einem
// Kunden — meldet sich auf demselben Gerät ein anderer an, wandert es.
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  token: text('token').notNull().unique(),
  platform: text('platform').notNull(), // 'ios' | 'android'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PushToken = typeof pushTokens.$inferSelect;
