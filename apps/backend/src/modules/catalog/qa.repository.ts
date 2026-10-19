import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { qaEntries, qaEntryLinks } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';
import { likeAny } from './norm-sql';

export interface QaZiele {
  productIds?: string[];
  categoryIds?: string[];
  bedarfIds?: string[];
  krankheitsbildIds?: string[];
}

@Injectable()
export class QaRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  /** Veröffentlichte Einträge mit mindestens einem Link auf eines der Ziele,
   * dedupliziert. `rang` = Index des ersten passenden Zieltyps in der Reihenfolge
   * Produkt → Kategorie → Bedarf → Krankheitsbild (spezifisch vor allgemein). */
  async listForZiele(tenant: TenantContext, ziele: QaZiele) {
    const bedingungen: { rang: number; sql: SQL }[] = [];
    if (ziele.productIds?.length) bedingungen.push({ rang: 0, sql: inArray(qaEntryLinks.productId, ziele.productIds) });
    if (ziele.categoryIds?.length) bedingungen.push({ rang: 1, sql: inArray(qaEntryLinks.categoryId, ziele.categoryIds) });
    if (ziele.bedarfIds?.length) bedingungen.push({ rang: 2, sql: inArray(qaEntryLinks.bedarfId, ziele.bedarfIds) });
    if (ziele.krankheitsbildIds?.length) {
      bedingungen.push({ rang: 3, sql: inArray(qaEntryLinks.krankheitsbildId, ziele.krankheitsbildIds) });
    }
    if (bedingungen.length === 0) return [];

    const rangSql = sql<number>`MIN(CASE ${sql.join(
      bedingungen.map((b) => sql`WHEN ${b.sql} THEN ${b.rang}`),
      sql` `,
    )} END)`;
    const treffer = await this.db
      .select({ qaEntryId: qaEntryLinks.qaEntryId, rang: rangSql })
      .from(qaEntryLinks)
      .where(and(this.tenantFilter(qaEntryLinks.organizationId, tenant), or(...bedingungen.map((b) => b.sql))))
      .groupBy(qaEntryLinks.qaEntryId);
    if (treffer.length === 0) return [];

    const rang = new Map(treffer.map((t) => [t.qaEntryId, Number(t.rang)]));
    const eintraege = await this.db
      .select()
      .from(qaEntries)
      .where(
        and(
          this.tenantFilter(qaEntries.organizationId, tenant),
          eq(qaEntries.isPublished, true),
          inArray(qaEntries.id, [...rang.keys()]),
        ),
      )
      .orderBy(asc(qaEntries.sortOrder));
    return eintraege.sort((a, b) => rang.get(a.id)! - rang.get(b.id)!);
  }

  /** Volltextsuche über Frage und Antwort mit denselben synonym-erweiterten,
   * normalisierten Begriffen wie die Produktsuche. */
  search(tenant: TenantContext, begriffe: string[]) {
    if (begriffe.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(qaEntries)
      .where(
        and(
          this.tenantFilter(qaEntries.organizationId, tenant),
          eq(qaEntries.isPublished, true),
          or(likeAny(qaEntries.frage, begriffe), likeAny(qaEntries.antwort, begriffe)),
        ),
      )
      .orderBy(asc(qaEntries.sortOrder));
  }

  async findBySlug(tenant: TenantContext, slug: string) {
    const [row] = await this.db
      .select()
      .from(qaEntries)
      .where(
        and(this.tenantFilter(qaEntries.organizationId, tenant), eq(qaEntries.slug, slug), eq(qaEntries.isPublished, true)),
      )
      .limit(1);
    return row ?? null;
  }

  listLinks(tenant: TenantContext, qaEntryId: string) {
    return this.db
      .select()
      .from(qaEntryLinks)
      .where(and(this.tenantFilter(qaEntryLinks.organizationId, tenant), eq(qaEntryLinks.qaEntryId, qaEntryId)));
  }
}
