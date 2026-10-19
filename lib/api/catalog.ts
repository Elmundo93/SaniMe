import type { KatalogKategorie, PassendeProdukte, Produkt, ProduktDetail } from '@sanime/domain';
import { request } from './client';

// Public endpoints — no bearer token sent, the catalog is browsable before any
// session exists. Suchbegriffe, Bedarfs- und Krankheitsbild-IDs sind potenziell
// Gesundheitsdaten: sie gehen nur als Query an den Katalog, nie in Analytics
// oder Logs (Backend maskiert Query-Werte in Sentry).

export type Kategorie = KatalogKategorie;

export function listCategories(): Promise<Kategorie[]> {
  return request('GET', '/catalog/categories', { auth: false });
}

export interface ListProductsFilters {
  categoryId?: string;
  q?: string;
  bedarfId?: string;
  krankheitsbildId?: string;
  /** Attribut-Filter, geprüft gegen @sanime/domain's KATALOG_FILTER (nur mit categoryId). */
  filter?: Record<string, string>;
  limit?: number;
  cursor?: number;
}

export function listProducts(filters: ListProductsFilters = {}): Promise<Produkt[]> {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.q) params.set('q', filters.q);
  if (filters.bedarfId) params.set('bedarfId', filters.bedarfId);
  if (filters.krankheitsbildId) params.set('krankheitsbildId', filters.krankheitsbildId);
  for (const [schluessel, wert] of Object.entries(filters.filter ?? {})) {
    params.set(`filter[${schluessel}]`, wert);
  }
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.cursor !== undefined) params.set('cursor', String(filters.cursor));
  const query = params.toString();
  return request('GET', `/products${query ? `?${query}` : ''}`, { auth: false });
}

export function getProduct(id: string): Promise<ProduktDetail> {
  return request('GET', `/products/${id}`, { auth: false });
}

/** Zubehör / Ersatzteile / Dienstleistungen — mit variantId nur, was zu dieser Ausführung passt. */
export function listRelated(id: string, variantId?: string): Promise<PassendeProdukte> {
  const query = variantId ? `?variantId=${encodeURIComponent(variantId)}` : '';
  return request('GET', `/products/${id}/related${query}`, { auth: false });
}
