import { sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/** SQL-Gegenstück zu @sanime/domain's normalisiere() (ohne Satzzeichen-Entfernung —
 * die betrifft nur den Suchtext). Muss zum Trigram-Index der Migration 0018 passen. */
export function normSql(column: PgColumn | SQL): SQL {
  return sql`replace(replace(replace(replace(lower(${column}), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss')`;
}

/** normalisierte Spalte enthält mindestens einen der (bereits normalisierten) Begriffe. */
export function likeAny(column: PgColumn | SQL, begriffe: string[]): SQL {
  const muster = begriffe.map((b) => sql`${`%${b}%`}`);
  return sql`${normSql(column)} LIKE ANY (ARRAY[${sql.join(muster, sql`, `)}]::text[])`;
}
