import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// One row per (idempotency key, request). Replays of the same key return the
// stored response instead of re-running the handler; a same-key request with
// a different body is rejected as a conflict. Generic — any future mutating
// endpoint opts in by requiring the Idempotency-Key header.
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  requestHash: text('request_hash').notNull(),
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type IdempotencyKeyRow = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKeyRow = typeof idempotencyKeys.$inferInsert;
