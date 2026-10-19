import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  erweitereSuchbegriffe,
  findeBedarf,
  findeKrankheitsbild,
  normalisiere,
  pruefeFilter,
  suchwoerter,
  type PassendeProdukte,
  type ProduktBeziehung,
} from '@sanime/domain';
import type { TenantContext } from '../../common/repository/tenant-context';
import { toProdukt, toProduktDetail, toQaEintrag } from './catalog.mapper';
import { CategoriesRepository } from './categories.repository';
import { ProductsRepository, type ProductListFilters } from './products.repository';
import { QaRepository, type QaZiele } from './qa.repository';
import { SuppliersRepository } from './suppliers.repository';

export interface ProductQuery {
  categoryId?: string;
  query?: string;
  bedarfId?: string;
  krankheitsbildId?: string;
  /** Rohe filter[…]-Werte — geprüft gegen @sanime/domain's KATALOG_FILTER. */
  filter?: Record<string, string>;
  nurHilfsmittel?: boolean;
}

export interface QaQuery {
  productId?: string;
  categoryId?: string;
  bedarfId?: string;
  krankheitsbildId?: string;
  query?: string;
}

const BEZIEHUNGSARTEN: ProduktBeziehung[] = ['zubehoer', 'ersatzteil', 'dienstleistung'];

// Ein Ratgeber-Eintrag zeigt höchstens so viele verknüpfte Produkte.
const QA_PRODUKTE_MAX = 6;

@Injectable()
export class CatalogService {
  constructor(
    private readonly categories: CategoriesRepository,
    private readonly products: ProductsRepository,
    private readonly suppliers: SuppliersRepository,
    private readonly qa: QaRepository,
  ) {}

  listCategories(tenant: TenantContext) {
    return this.categories.listAll(tenant);
  }

  listActiveCategories(tenant: TenantContext) {
    return this.categories.listActive(tenant);
  }

  /** Katalogliste: jede Einschränkung (Kategorie, Bedarf, Krankheitsbild) engt die
   * Kategorie-Menge weiter ein; eine Hauptkategorie schließt ihre Kinder ein. */
  async listProducts(tenant: TenantContext, query: ProductQuery = {}) {
    const repoFilter: ProductListFilters = { nurHilfsmittel: query.nurHilfsmittel };
    const kategorieMengen: string[][] = [];
    let filterKategorieSlug: string | null = null;

    if (query.categoryId) {
      const kategorie = await this.categories.findById(tenant, query.categoryId);
      if (!kategorie) return [];
      filterKategorieSlug = kategorie.slug;
      kategorieMengen.push(await this.categories.expandWithChildren(tenant, [kategorie.id]));
    }
    if (query.bedarfId) {
      kategorieMengen.push(await this.kategorieIdsFuerBedarf(tenant, query.bedarfId));
    }
    if (query.krankheitsbildId) {
      kategorieMengen.push(await this.kategorieIdsFuerKrankheitsbild(tenant, query.krankheitsbildId));
    }
    if (kategorieMengen.length > 0) {
      repoFilter.categoryIds = kategorieMengen.reduce((a, b) => a.filter((id) => b.includes(id)));
    }

    if (query.filter && Object.keys(query.filter).length > 0) {
      const pruefung = pruefeFilter(filterKategorieSlug, query.filter);
      if (!pruefung.ok) throw new BadRequestException(pruefung.fehler);
      repoFilter.attributFilter = pruefung.filter;
    }

    const suchtext = query.query?.trim();
    if (suchtext) {
      repoFilter.suchbegriffe = erweitereSuchbegriffe(suchtext);
      repoFilter.suchwoerter = suchwoerter(suchtext);
      // Nur Füllwörter („ich suche etwas“) — kein sinnvoller Suchbegriff übrig.
      if (repoFilter.suchbegriffe.length === 0) return [];
    }

    const rows = await this.products.listActive(tenant, repoFilter);
    return suchtext ? rankeSuchtreffer(rows, suchtext, repoFilter.suchbegriffe!) : rows;
  }

  private async kategorieIdsFuerBedarf(tenant: TenantContext, bedarfId: string) {
    const bedarf = findeBedarf(bedarfId);
    if (!bedarf) throw new BadRequestException('Unbekannter Bedarf');
    const kategorien = await this.categories.findBySlugs(tenant, bedarf.kategorieSlugs);
    return this.categories.expandWithChildren(
      tenant,
      kategorien.map((k) => k.id),
    );
  }

  private async kategorieIdsFuerKrankheitsbild(tenant: TenantContext, krankheitsbildId: string) {
    const kategorien = await this.categories.findByKrankheitsbildId(tenant, krankheitsbildId);
    return this.categories.expandWithChildren(
      tenant,
      kategorien.map((k) => k.id),
    );
  }

  async getProduct(tenant: TenantContext, id: string) {
    const product = await this.products.findById(tenant, id);
    if (!product) {
      throw new NotFoundException('Produkt nicht gefunden');
    }
    return product;
  }

  async getProductDetail(tenant: TenantContext, id: string) {
    const product = await this.getProduct(tenant, id);
    const [images, variants] = await Promise.all([
      this.products.listImages(tenant, id),
      this.products.listVariants(tenant, id),
    ]);
    return toProduktDetail(product, images, variants, process.env.CATALOG_IMAGE_BASE_URL);
  }

  /** Zubehör / Ersatzteile / Dienstleistungen, gruppiert. Nur aktive Zielprodukte. */
  async listRelatedProducts(tenant: TenantContext, id: string, variantId?: string): Promise<PassendeProdukte> {
    await this.getProduct(tenant, id);
    if (variantId) {
      const varianten = await this.products.listVariants(tenant, id);
      if (!varianten.some((v) => v.id === variantId)) {
        throw new BadRequestException('Diese Ausführung gehört nicht zum Produkt');
      }
    }
    const beziehungen = await this.products.listRelations(tenant, id, variantId);
    const ergebnis: PassendeProdukte = { zubehoer: [], ersatzteil: [], dienstleistung: [] };
    if (beziehungen.length === 0) return ergebnis;

    const ziele = await this.products.listActive(tenant, {});
    const zielById = new Map(ziele.filter((z) => beziehungen.some((b) => b.targetProductId === z.id)).map((z) => [z.id, z]));
    for (const b of beziehungen) {
      const ziel = zielById.get(b.targetProductId);
      const art = b.relationType as ProduktBeziehung;
      if (ziel && BEZIEHUNGSARTEN.includes(art)) ergebnis[art].push(toProdukt(ziel));
    }
    return ergebnis;
  }

  // ─── Ratgeber ──────────────────────────────────────────────────────────────

  async listQa(tenant: TenantContext, query: QaQuery) {
    const gesetzt = [query.productId, query.categoryId, query.bedarfId, query.krankheitsbildId, query.query].filter(Boolean);
    if (gesetzt.length !== 1) {
      throw new BadRequestException('Genau einer von productId, categoryId, bedarfId, krankheitsbildId oder q ist erforderlich');
    }
    if (query.query) {
      const eintraege = await this.qa.search(tenant, erweitereSuchbegriffe(query.query));
      return eintraege.map(toQaEintrag);
    }

    const ziele: QaZiele = {};
    if (query.productId) {
      // Produkt → seine Kategorie → deren Elternkategorie: eine Frage an
      // „Rollatoren“ erscheint bei jedem Rollator, ohne Pflege pro Produkt.
      const product = await this.products.findRawById(tenant, query.productId);
      if (!product) throw new NotFoundException('Produkt nicht gefunden');
      ziele.productIds = [product.id];
      ziele.categoryIds = await this.kategorieMitEltern(tenant, product.categoryId);
    } else if (query.categoryId) {
      ziele.categoryIds = await this.kategorieMitEltern(tenant, query.categoryId);
    } else if (query.bedarfId) {
      if (!findeBedarf(query.bedarfId)) throw new BadRequestException('Unbekannter Bedarf');
      ziele.bedarfIds = [query.bedarfId];
      ziele.categoryIds = await this.kategorieIdsFuerBedarf(tenant, query.bedarfId);
    } else if (query.krankheitsbildId) {
      if (!findeKrankheitsbild(query.krankheitsbildId)) throw new BadRequestException('Unbekanntes Krankheitsbild');
      ziele.krankheitsbildIds = [query.krankheitsbildId];
      ziele.categoryIds = await this.kategorieIdsFuerKrankheitsbild(tenant, query.krankheitsbildId);
    }
    const eintraege = await this.qa.listForZiele(tenant, ziele);
    return eintraege.map(toQaEintrag);
  }

  private async kategorieMitEltern(tenant: TenantContext, categoryId: string): Promise<string[]> {
    const kategorie = await this.categories.findById(tenant, categoryId);
    if (!kategorie) return [];
    return kategorie.parentId ? [kategorie.id, kategorie.parentId] : [kategorie.id];
  }

  async getQaEntry(tenant: TenantContext, slug: string) {
    const eintrag = await this.qa.findBySlug(tenant, slug);
    if (!eintrag) throw new NotFoundException('Ratgeber-Eintrag nicht gefunden');

    const links = await this.qa.listLinks(tenant, eintrag.id);
    const productIds = links.map((l) => l.productId).filter((id): id is string => !!id);
    const categoryIds = await this.categories.expandWithChildren(
      tenant,
      links.map((l) => l.categoryId).filter((id): id is string => !!id),
    );
    const [direkt, ausKategorien] = await Promise.all([
      productIds.length ? this.products.listActive(tenant, {}).then((all) => all.filter((p) => productIds.includes(p.id))) : [],
      categoryIds.length ? this.products.listActive(tenant, { categoryIds }) : [],
    ]);
    const produkte = [...direkt, ...ausKategorien.filter((p) => !productIds.includes(p.id))].slice(0, QA_PRODUKTE_MAX);
    return { ...toQaEintrag(eintrag), produkte: produkte.map(toProdukt) };
  }

  // Used by Onboarding/Supply-Order to validate a customer's product
  // selection actually exists for this tenant before persisting it.
  async assertProductExists(tenant: TenantContext, id: string) {
    const product = await this.products.findRawById(tenant, id);
    if (!product) {
      throw new NotFoundException('Produkt nicht gefunden');
    }
    return product;
  }

  listSuppliers(tenant: TenantContext) {
    return this.suppliers.listAll(tenant);
  }

  // Thin delegates for the Appointment module — Catalog keeps owning
  // suppliers/supplier_products, Appointment never imports the repositories
  // directly (same "modules export only their Service" discipline as Admin).
  async getSupplier(tenant: TenantContext, id: string) {
    const supplier = await this.suppliers.findById(tenant, id);
    if (!supplier) {
      throw new NotFoundException('Lieferant nicht gefunden');
    }
    return supplier;
  }

  async getSupplierProduct(tenant: TenantContext, supplierId: string, productId: string) {
    const supplierProduct = await this.products.findSupplierProduct(tenant, supplierId, productId);
    if (!supplierProduct) {
      throw new NotFoundException('Lieferant bietet dieses Produkt nicht an');
    }
    return supplierProduct;
  }
}

type Suchzeile = { name: string; description: string; kurzbeschreibung: string | null; categoryName: string };

/** Ranking: exakter Treffer im Namen > Synonym im Namen > Kategorie > Beschreibung >
 * nur Tippfehler-Ähnlichkeit. Stabil, damit gleich gute Treffer in Katalogreihenfolge bleiben. */
function rankeSuchtreffer<T extends Suchzeile>(rows: T[], suchtext: string, begriffe: string[]): T[] {
  const norm = (s: string | null) => normalisiere(s ?? '');
  const roh = norm(suchtext);
  const rang = (row: T) => {
    const name = norm(row.name);
    if (name.includes(roh)) return 4;
    if (begriffe.some((b) => name.includes(b))) return 3;
    if (begriffe.some((b) => norm(row.categoryName).includes(b))) return 2;
    if (begriffe.some((b) => norm(row.kurzbeschreibung).includes(b) || norm(row.description).includes(b))) return 1;
    return 0;
  };
  return rows
    .map((row, index) => ({ row, index, rang: rang(row) }))
    .sort((a, b) => b.rang - a.rang || a.index - b.index)
    .map((t) => t.row);
}
