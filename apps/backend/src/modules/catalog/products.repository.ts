import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { PREIS_FILTER_SCHLUESSEL, type GepruefterFilter } from '@sanime/domain';
import { DRIZZLE, type Database } from '../../db/client';
import {
  catalogCategories,
  manufacturers,
  productImages,
  productRelations,
  products,
  productVariants,
  supplierProducts,
  suppliers,
} from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';
import { likeAny, normSql } from './norm-sql';

const PRODUCT_COLUMNS = {
  id: products.id,
  name: products.name,
  description: products.description,
  kurzbeschreibung: products.kurzbeschreibung,
  artikelnummer: products.artikelnummer,
  hilfsmittelnummer: products.hilfsmittelnummer,
  features: products.features,
  attributes: products.attributes,
  requiresApproval: products.requiresApproval,
  vatRatePercent: products.vatRatePercent,
  categoryId: products.categoryId,
  categoryName: catalogCategories.name,
  categorySlug: catalogCategories.slug,
  categoryIcon: catalogCategories.icon,
  manufacturerName: manufacturers.name,
};

// Ab dieser Ähnlichkeit gilt ein Wort als Tippfehler-Treffer („Rolator“ → „Rollator“).
const TRIGRAM_SCHWELLE = 0.5;

export interface ProductListFilters {
  categoryIds?: string[];
  /** Normalisierte, synonym-erweiterte Begriffe (erweitereSuchbegriffe). */
  suchbegriffe?: string[];
  /** Normalisierte Einzelwörter für die Tippfehler-Toleranz (suchwoerter). */
  suchwoerter?: string[];
  attributFilter?: GepruefterFilter[];
  /** Nur Kassenprodukte (mit Hilfsmittelnummer) — für die Rezept-Versorgungsauswahl. */
  nurHilfsmittel?: boolean;
}

@Injectable()
export class ProductsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async listActive(tenant: TenantContext, filters: ProductListFilters = {}) {
    const conditions: SQL[] = [
      this.tenantFilter(products.organizationId, tenant),
      eq(products.isActive, true),
      eq(catalogCategories.isActive, true),
    ];
    if (filters.categoryIds) {
      // Eine leere Liste heißt „keine passende Kategorie“, nicht „alle“.
      if (filters.categoryIds.length === 0) return [];
      conditions.push(inArray(products.categoryId, filters.categoryIds));
    }
    if (filters.nurHilfsmittel) conditions.push(sql`${products.hilfsmittelnummer} IS NOT NULL`);
    if (filters.suchbegriffe && filters.suchbegriffe.length > 0) {
      const begriffe = filters.suchbegriffe;
      const trigram = (filters.suchwoerter ?? []).map(
        (wort) => sql`word_similarity(${wort}, ${normSql(products.name)}) > ${TRIGRAM_SCHWELLE}`,
      );
      conditions.push(
        or(
          likeAny(products.name, begriffe),
          likeAny(products.kurzbeschreibung, begriffe),
          likeAny(products.description, begriffe),
          likeAny(catalogCategories.name, begriffe),
          ...trigram,
        )!,
      );
    }
    for (const filter of filters.attributFilter ?? []) {
      conditions.push(this.attributBedingung(filter));
    }

    const rows = await this.db
      .select(PRODUCT_COLUMNS)
      .from(products)
      .innerJoin(catalogCategories, eq(products.categoryId, catalogCategories.id))
      .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(and(...conditions))
      .orderBy(asc(catalogCategories.sortOrder), asc(products.name));
    if (rows.length === 0) return [];

    // Offers for all listed products in one query (no N+1) — without them
    // toProdukt() would show every product as "Kein Eigenanteil" in the
    // catalog and in Krankheitsbild recommendations.
    const offers = await this.selectOffers(inArray(supplierProducts.productId, rows.map((r) => r.id)));
    return rows.map((row) => ({ ...row, offers: offers.filter((o) => o.productId === row.id) }));
  }

  // Schlüssel und Werte sind gegen @sanime/domain's KATALOG_FILTER geprüft
  // (pruefeFilter) — trotzdem durchgehend als Parameter, nie interpoliert.
  private attributBedingung(filter: GepruefterFilter): SQL {
    if (filter.typ === 'bereich' && filter.schluessel === PREIS_FILTER_SCHLUESSEL) {
      return sql`EXISTS (
        SELECT 1 FROM ${supplierProducts}
        WHERE ${supplierProducts.productId} = ${products.id}
          AND ${supplierProducts.isActive} = true
          AND ${supplierProducts.customerCopayCents} <= ${Math.round(filter.wert * 100)}
      )`;
    }
    const wert = sql`${products.attributes} ->> ${filter.schluessel}`;
    if (filter.typ === 'bool') return sql`${wert} = 'true'`;
    if (filter.typ === 'auswahl') return sql`${filter.wert} = ANY (string_to_array(${wert}, ','))`;
    const vergleich = filter.richtung === 'min' ? sql`>=` : sql`<=`;
    return sql`CASE WHEN jsonb_typeof(${products.attributes} -> ${filter.schluessel}) = 'number'
      THEN (${wert})::numeric ${vergleich} ${filter.wert} ELSE false END`;
  }

  async findById(tenant: TenantContext, id: string) {
    const [product] = await this.db
      .select(PRODUCT_COLUMNS)
      .from(products)
      .innerJoin(catalogCategories, eq(products.categoryId, catalogCategories.id))
      .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(and(this.tenantFilter(products.organizationId, tenant), eq(products.id, id)))
      .limit(1);
    if (!product) return null;

    const offers = await this.selectOffers(eq(supplierProducts.productId, id));
    return { ...product, offers };
  }

  // Verfügbare Angebote zuerst — toProdukt() nimmt das erste als Hauptangebot.
  // Stabil in JS sortiert statt ORDER BY: bei Gleichstand bleibt die bisherige
  // Reihenfolge (Einfügereihenfolge) erhalten, Postgres' Sortierung ist nicht stabil.
  private async selectOffers(productFilter: SQL) {
    const offers = await this.db
      .select({
        id: supplierProducts.id,
        productId: supplierProducts.productId,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        deliveryTimeDays: supplierProducts.deliveryTimeDays,
        customerCopayCents: supplierProducts.customerCopayCents,
        selfPayPriceCents: supplierProducts.selfPayPriceCents,
        availability: supplierProducts.availability,
      })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .where(and(productFilter, eq(supplierProducts.isActive, true)));
    const verfuegbar = (o: { availability: string }) => (o.availability === 'available' ? 0 : 1);
    return offers.sort((a, b) => verfuegbar(a) - verfuegbar(b));
  }

  listImages(tenant: TenantContext, productId: string) {
    return this.db
      .select()
      .from(productImages)
      .where(and(this.tenantFilter(productImages.organizationId, tenant), eq(productImages.productId, productId)))
      .orderBy(asc(productImages.sortOrder));
  }

  listVariants(tenant: TenantContext, productId: string) {
    return this.db
      .select()
      .from(productVariants)
      .where(
        and(
          this.tenantFilter(productVariants.organizationId, tenant),
          eq(productVariants.productId, productId),
          eq(productVariants.isActive, true),
        ),
      )
      .orderBy(asc(productVariants.sku));
  }

  /** Beziehungen eines Produkts. Ohne variantId nur, was zu allen Ausführungen
   * passt; mit variantId zusätzlich das variantenspezifische — inkompatibles
   * Zubehör erscheint so nie. */
  listRelations(tenant: TenantContext, productId: string, variantId?: string) {
    return this.db
      .select({ targetProductId: productRelations.targetProductId, relationType: productRelations.relationType })
      .from(productRelations)
      .where(
        and(
          this.tenantFilter(productRelations.organizationId, tenant),
          eq(productRelations.sourceProductId, productId),
          variantId
            ? or(isNull(productRelations.sourceVariantId), eq(productRelations.sourceVariantId, variantId))
            : isNull(productRelations.sourceVariantId),
        ),
      );
  }

  // Used by Onboarding/Supply-Order to validate a selection exists, without
  // paying for the display-oriented joins above.
  async findRawById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(this.tenantFilter(products.organizationId, tenant), eq(products.id, id)))
      .limit(1);
    return row ?? null;
  }

  // Used by Appointment's SupplierCalendarService to anchor the earliest
  // proposable day off the real deliveryTimeDays for the pair, replacing the
  // client mock's regex-parsed free-text lieferzeit.
  async findSupplierProduct(tenant: TenantContext, supplierId: string, productId: string) {
    const [row] = await this.db
      .select()
      .from(supplierProducts)
      .where(
        and(
          this.tenantFilter(supplierProducts.organizationId, tenant),
          eq(supplierProducts.supplierId, supplierId),
          eq(supplierProducts.productId, productId),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}
