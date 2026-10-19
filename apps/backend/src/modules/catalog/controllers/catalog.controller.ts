import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { CatalogService } from '../catalog.service';
import { toKatalogKategorie, toProdukt } from '../catalog.mapper';

const MAX_LIMIT = 100;

// filter[faltbar]=true kommt je nach Query-Parser als verschachteltes Objekt
// ({ filter: { faltbar: 'true' } }, Express' "extended"/qs) oder als flacher
// Schlüssel ('filter[faltbar]'). Beides wird hier auf { faltbar: 'true' }
// gebracht; Validierung gegen @sanime/domain's KATALOG_FILTER macht der Service.
function leseFilter(query: Record<string, unknown>): Record<string, string> {
  const filter: Record<string, string> = {};
  const verschachtelt = query.filter;
  if (verschachtelt && typeof verschachtelt === 'object' && !Array.isArray(verschachtelt)) {
    for (const [k, v] of Object.entries(verschachtelt)) filter[k] = String(v);
  }
  for (const [k, v] of Object.entries(query)) {
    const treffer = /^filter\[(.+)\]$/.exec(k);
    if (treffer) filter[treffer[1]] = String(v);
  }
  return filter;
}

function leseGanzzahl(wert: unknown, name: string): number | undefined {
  if (wert === undefined) return undefined;
  const zahl = Number(wert);
  if (!Number.isInteger(zahl) || zahl < 0) throw new BadRequestException(`${name} muss eine nichtnegative Ganzzahl sein`);
  return zahl;
}

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // The catalog reads below are deliberately public: /katalog is browsable
  // before any onboarding session exists (browsing never calls starten()),
  // and they expose only catalog data — no health/customer data. Categories
  // are mapped via toKatalogKategorie so no tenant internals leak.
  // Suchbegriffe/Bedarfs-/Krankheitsbild-IDs im Query-String sind potenziell
  // Gesundheitsdaten — scrub.ts maskiert Query-Werte in Sentry, der
  // Fehlerfilter gibt nur request.path zurück. Hier nichts davon loggen.
  @Get('catalog/categories')
  async listCategories() {
    const categories = await this.catalog.listActiveCategories(DEFAULT_TENANT_CONTEXT);
    return categories.map(toKatalogKategorie);
  }

  // Mapped to @sanime/domain's Produkt shape (not the raw joined repository
  // row) — this is what the app's /katalog browse screens and the onboarding
  // event payloads both expect. Pagination: limit + cursor (Offset als
  // String); eine volle Seite heißt „es kann weitere geben“.
  @Get('products')
  async listProducts(@Query() query: Record<string, unknown>) {
    const text = (key: string) => (typeof query[key] === 'string' && query[key] ? (query[key] as string) : undefined);
    const limit = leseGanzzahl(query.limit, 'limit');
    const offset = leseGanzzahl(query.cursor, 'cursor') ?? 0;
    const products = await this.catalog.listProducts(DEFAULT_TENANT_CONTEXT, {
      categoryId: text('categoryId'),
      query: text('q'),
      bedarfId: text('bedarfId'),
      krankheitsbildId: text('krankheitsbildId'),
      filter: leseFilter(query),
    });
    const seite = limit === undefined ? products.slice(offset) : products.slice(offset, offset + Math.min(limit, MAX_LIMIT));
    return seite.map(toProdukt);
  }

  // Detailform (Bilder, Attribute, Artikelnummer, Varianten) — ein Superset von
  // Produkt, damit bestehende Aufrufer unverändert weiterlesen.
  @Get('products/:id')
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.getProductDetail(DEFAULT_TENANT_CONTEXT, id);
  }

  @Get('products/:id/related')
  listRelated(@Param('id', ParseUUIDPipe) id: string, @Query('variantId') variantId?: string) {
    return this.catalog.listRelatedProducts(DEFAULT_TENANT_CONTEXT, id, variantId || undefined);
  }

  // Ratgeber: redaktioneller, öffentlicher Inhalt ohne Nutzereingaben.
  @Get('qa')
  listQa(
    @Query('productId') productId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('bedarfId') bedarfId?: string,
    @Query('krankheitsbildId') krankheitsbildId?: string,
    @Query('q') q?: string,
  ) {
    return this.catalog.listQa(DEFAULT_TENANT_CONTEXT, {
      productId: productId || undefined,
      categoryId: categoryId || undefined,
      bedarfId: bedarfId || undefined,
      krankheitsbildId: krankheitsbildId || undefined,
      query: q?.trim() || undefined,
    });
  }

  @Get('qa/:slug')
  getQa(@Param('slug') slug: string) {
    return this.catalog.getQaEntry(DEFAULT_TENANT_CONTEXT, slug);
  }

  @Get('suppliers')
  @UseGuards(AdminJwtAuthGuard)
  listSuppliers() {
    return this.catalog.listSuppliers(DEFAULT_TENANT_CONTEXT);
  }
}
