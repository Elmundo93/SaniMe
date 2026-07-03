import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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
  status: text('status').notNull().default('pending'), // 'pending' | 'sent' | 'failed'
  failureReason: text('failure_reason'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
