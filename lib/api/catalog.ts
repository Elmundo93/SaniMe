import type { Produkt } from '@sanime/domain';
import { request } from './client';

export interface Kategorie {
  id: string;
  name: string;
}

export function listCategories(): Promise<Kategorie[]> {
  return request('GET', '/catalog/categories');
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
  return request('GET', `/products${query ? `?${query}` : ''}`);
}

export function getProduct(id: string): Promise<Produkt> {
  return request('GET', `/products/${id}`);
}
