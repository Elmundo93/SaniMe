import type { Produkt } from '@sanime/domain';
import { request } from './client';

// Public endpoints — no bearer token sent, /katalog works before any session exists.

export interface Kategorie {
  id: string;
  name: string;
}

export function listCategories(): Promise<Kategorie[]> {
  return request('GET', '/catalog/categories', { auth: false });
}

export interface ListProductsFilters {
  categoryId?: string;
  q?: string;
}

export function listProducts(filters: ListProductsFilters = {}): Promise<Produkt[]> {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.q) params.set('q', filters.q);
  const query = params.toString();
  return request('GET', `/products${query ? `?${query}` : ''}`, { auth: false });
}

export function getProduct(id: string): Promise<Produkt> {
  return request('GET', `/products/${id}`, { auth: false });
}
