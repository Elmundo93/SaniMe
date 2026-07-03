import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin-users.schema';
import { orders } from './supply-order.schema';

// Admin-only concept, not part of the customer-facing Supply/Order domain —
// lives in the admin module's own schema file rather than supply-order.schema.ts.
export const orderNotes = pgTable('order_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  authorAdminId: uuid('author_admin_id')
    .notNull()
    .references(() => adminUsers.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OrderNote = typeof orderNotes.$inferSelect;
export type NewOrderNote = typeof orderNotes.$inferInsert;
