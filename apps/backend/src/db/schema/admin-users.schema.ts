import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // Anzeigename im Admin-Bereich („Übernommen von Anna“). Leer = E-Mail zeigen.
  name: text('name').notNull().default(''),
  // TOTP-Zweitfaktor (Pflicht): verschlüsselt (admin-totp.ts), totpActivatedAt
  // erst nach dem ersten gültigen Code gesetzt — bis dahin läuft die Einrichtung.
  totpSecretEncrypted: text('totp_secret_encrypted'),
  totpActivatedAt: timestamp('totp_activated_at', { withTimezone: true }),
  // Deaktiviert statt gelöscht — Audit-Einträge und Notizen verweisen weiter auf die Person.
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
