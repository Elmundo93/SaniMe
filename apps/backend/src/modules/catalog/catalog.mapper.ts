import type { KatalogKategorie, Produkt, ProduktDetail, ProduktVariante, QaEintrag } from '@sanime/domain';
import type { CatalogCategory, ProductImage, ProductVariant, QaEntry } from '../../db/schema';

export interface CatalogProductJoined {
  id: string;
  name: string;
  description: string;
  hilfsmittelnummer: string | null;
  features: unknown;
  categoryName: string;
  manufacturerName: string;
  // Katalog-Felder — optional, damit bestehende Aufrufer (und Tests mit
  // handgebauten Zeilen) ohne sie weiter mappen.
  kurzbeschreibung?: string | null;
  artikelnummer?: string | null;
  attributes?: unknown;
  requiresApproval?: boolean;
  categoryId?: string;
  categorySlug?: string;
  categoryIcon?: string | null;
  // Loaded by both ProductsRepository.findById and listActive; a product
  // without any active offer maps to eigenanteil 0 / lieferzeit 'unbekannt'.
  // Verfügbare Angebote stehen zuerst (ProductsRepository.selectOffers).
  offers?: { deliveryTimeDays: number; customerCopayCents: number; selfPayPriceCents?: number | null; availability?: string }[];
}

// Maps the Catalog module's joined product shape (see products.repository.ts)
// to @sanime/domain's Produkt — the shape both the onboarding workflow engine
// and the app's /katalog browse screen expect. Lives in the Catalog module
// (not Onboarding's) since CatalogController's own GET /products, /products/:id
// endpoints need it directly, and Onboarding already depends on Catalog, not
// the reverse. Einzige Mapping-Naht zwischen DB und Domain.
export function toProdukt(product: CatalogProductJoined): Produkt {
  const primaryOffer = product.offers?.[0];
  return {
    id: product.id,
    name: product.name,
    hersteller: product.manufacturerName,
    hilfsmittelNr: product.hilfsmittelnummer ?? undefined,
    beschreibung: product.description,
    eigenanteil: primaryOffer ? primaryOffer.customerCopayCents / 100 : 0,
    selbstzahlerPreis:
      product.hilfsmittelnummer && primaryOffer?.selfPayPriceCents != null ? primaryOffer.selfPayPriceCents / 100 : undefined,
    lieferzeit: primaryOffer ? `${primaryOffer.deliveryTimeDays} Werktage` : 'unbekannt',
    kategorie: product.categoryName,
    merkmale: Array.isArray(product.features) ? (product.features as string[]) : [],
    kurzbeschreibung: product.kurzbeschreibung ?? undefined,
    verfuegbar: istVerfuegbar(product),
    kategorieId: product.categoryId,
    kategorieIcon: product.categoryIcon ?? undefined,
  };
}

/** Bestellbar = mindestens ein aktives Angebot mit Verfügbarkeit 'available'. */
export function istVerfuegbar(product: Pick<CatalogProductJoined, 'offers'>): boolean {
  return (product.offers ?? []).some((o) => (o.availability ?? 'available') === 'available');
}

function toAttribute(value: unknown): Record<string, string | number | boolean> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, string | number | boolean>)
    : {};
}

export function toProduktVariante(variant: ProductVariant): ProduktVariante {
  return { id: variant.id, sku: variant.sku, attribute: toAttribute(variant.attributes) };
}

// Bild-URLs entstehen erst hier: storageKey + öffentliche Basis-URL (eigener
// Bucket/CDN, nie der Gesundheitsdokumente-Bucket). Ohne konfigurierte Basis
// gibt es keine Bilder — die App zeigt dann den Kategorie-Icon-Platzhalter.
export function toProduktDetail(
  product: CatalogProductJoined,
  images: ProductImage[],
  variants: ProductVariant[],
  imageBaseUrl: string | undefined,
): ProduktDetail {
  return {
    ...toProdukt(product),
    artikelnummer: product.artikelnummer ?? undefined,
    bilder: imageBaseUrl
      ? images.map((img) => ({ url: `${imageBaseUrl.replace(/\/$/, '')}/${img.storageKey}`, altText: img.altText }))
      : [],
    attribute: toAttribute(product.attributes),
    kategorieSlug: product.categorySlug,
    requiresApproval: product.requiresApproval ?? true,
    varianten: variants.map(toProduktVariante),
  };
}

// Öffentlich: keine Tenant-Interna (organizationId, krankheitsbildId, isActive).
export function toKatalogKategorie(category: CatalogCategory): KatalogKategorie {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    beschreibung: category.beschreibung ?? undefined,
    icon: category.icon ?? undefined,
    sortOrder: category.sortOrder,
  };
}

export function toQaEintrag(entry: QaEntry): QaEintrag {
  return {
    id: entry.id,
    slug: entry.slug,
    frage: entry.frage,
    kurzantwort: entry.kurzantwort ?? undefined,
    antwort: entry.antwort,
    quellen: Array.isArray(entry.quellen) ? (entry.quellen as QaEintrag['quellen']) : [],
    geprueftAm: entry.geprueftAm ? entry.geprueftAm.toISOString() : null,
  };
}
