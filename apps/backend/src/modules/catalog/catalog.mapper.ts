import type { Produkt } from '@sanime/domain';

export interface CatalogProductJoined {
  id: string;
  name: string;
  description: string;
  hilfsmittelnummer: string | null;
  features: unknown;
  categoryName: string;
  manufacturerName: string;
  // Only present when fetched via CatalogService.getProduct (a single
  // product); CatalogService.listProducts's lighter listing query doesn't
  // join supplier offers, so this is absent there — eigenanteil/lieferzeit
  // fall back to placeholders in that case, corrected once a specific
  // product is fetched individually (SUPPLY_AUSGEWAEHLT, complete()).
  offers?: { deliveryTimeDays: number; customerCopayCents: number }[];
}

// Maps the Catalog module's joined product shape (see products.repository.ts)
// to @sanime/domain's Produkt — the shape both the onboarding workflow engine
// and the app's /katalog browse screen expect. Lives in the Catalog module
// (not Onboarding's) since CatalogController's own GET /products, /products/:id
// endpoints need it directly, and Onboarding already depends on Catalog, not
// the reverse.
export function toProdukt(product: CatalogProductJoined): Produkt {
  const primaryOffer = product.offers?.[0];
  return {
    id: product.id,
    name: product.name,
    hersteller: product.manufacturerName,
    hilfsmittelNr: product.hilfsmittelnummer ?? undefined,
    beschreibung: product.description,
    eigenanteil: primaryOffer ? primaryOffer.customerCopayCents / 100 : 0,
    lieferzeit: primaryOffer ? `${primaryOffer.deliveryTimeDays} Werktage` : 'unbekannt',
    kategorie: product.categoryName,
    merkmale: Array.isArray(product.features) ? (product.features as string[]) : [],
  };
}
