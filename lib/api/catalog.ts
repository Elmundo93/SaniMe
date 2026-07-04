import { request } from './client';

export function listCategories(): Promise<any[]> {
  return request('GET', '/catalog/categories');
}

export function listProducts(): Promise<any[]> {
  return request('GET', '/products');
}

export function getProduct(id: string): Promise<any> {
  return request('GET', `/products/${id}`);
}
