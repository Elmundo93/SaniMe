import type { QaEintrag, QaEintragMitProdukten } from '@sanime/domain';
import { request } from './client';

// Ratgeber (kuratierte Q&A-Bibliothek) — öffentlicher, redaktioneller Inhalt,
// wie der übrige Katalog ohne Bearer-Token.

export type QaZiel =
  | { productId: string }
  | { categoryId: string }
  | { bedarfId: string }
  | { krankheitsbildId: string }
  | { q: string };

export function listQa(ziel: QaZiel): Promise<QaEintrag[]> {
  const [schluessel, wert] = Object.entries(ziel)[0];
  return request('GET', `/qa?${schluessel}=${encodeURIComponent(wert)}`, { auth: false });
}

export function getQa(slug: string): Promise<QaEintragMitProdukten> {
  return request('GET', `/qa/${encodeURIComponent(slug)}`, { auth: false });
}
