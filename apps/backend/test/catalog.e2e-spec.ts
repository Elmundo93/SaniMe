import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { seedAdminWithPermissions } from './helpers/seed-admin';
import { configureApp } from '../src/bootstrap';

describe('Catalog (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    // Die Admin-Strategie prüft, dass es die Person wirklich gibt und sie aktiv ist.
    adminToken = (await seedAdminWithPermissions(app, [])).token;
  });

  afterAll(async () => {
    await app.close();
  });

  // Catalog reads are public — /katalog is browsable before any onboarding
  // session (and thus any bearer token) exists.
  it('allows unauthenticated catalog reads', async () => {
    const products = await request(app.getHttpServer()).get('/api/v1/products').expect(200);
    expect(products.body.length).toBeGreaterThan(0);
    await request(app.getHttpServer()).get(`/api/v1/products/${products.body[0].id}`).expect(200);
    const categories = await request(app.getHttpServer()).get('/api/v1/catalog/categories').expect(200);
    // No tenant internals (organizationId, krankheitsbildId, isActive) leak.
    for (const k of categories.body) {
      expect(Object.keys(k).every((key) => ['id', 'name', 'slug', 'parentId', 'beschreibung', 'icon', 'sortOrder'].includes(key))).toBe(true);
    }
  });

  it('lists categories for an authenticated admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('lists active products mapped to the domain Produkt shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('kategorie');
    expect(res.body[0]).toHaveProperty('hersteller');
    // The listing carries real offer data (price/delivery time), not the
    // "Kein Eigenanteil" placeholder a list without offers would produce.
    expect(res.body.every((p: { eigenanteil: number; lieferzeit: string }) => p.eigenanteil > 0 && p.lieferzeit !== 'unbekannt')).toBe(true);
    expect(res.body.some((p: { verfuegbar: boolean }) => p.verfuegbar === false)).toBe(true);
  });

  it('filters products by categoryId and free-text query', async () => {
    const all = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(all.body.length).toBeGreaterThan(1);

    const selbstzahler = all.body.find((p: { hilfsmittelNr?: string }) => !p.hilfsmittelNr);
    expect(selbstzahler).toBeDefined();

    const byQuery = await request(app.getHttpServer())
      .get(`/api/v1/products?q=${encodeURIComponent(selbstzahler.name.split(' ')[0])}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(byQuery.body.some((p: { id: string }) => p.id === selbstzahler.id)).toBe(true);
  });

  it('gets a single product with a computed eigenanteil/lieferzeit from its primary offer', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const id = list.body[0].id;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.id).toBe(id);
    expect(typeof res.body.eigenanteil).toBe('number');
    expect(typeof res.body.lieferzeit).toBe('string');
  });

  it('404s for an unknown product id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('restricts GET /suppliers to admins only', async () => {
    await request(app.getHttpServer()).get('/api/v1/suppliers').expect(401);
    const res = await request(app.getHttpServer())
      .get('/api/v1/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  describe('Katalogausbau', () => {
    const PRODUKT = {
      rollatorLeicht: '40000000-0000-0000-0000-000000000004',
      rollatorOutdoor: '40000000-0000-0000-0000-000000000005',
      rollatorWohnung: '40000000-0000-0000-0000-000000000006',
      bremsset: '40000000-0000-0000-0000-000000000032',
      tasche: '40000000-0000-0000-0000-000000000030',
    };
    const get = (url: string) => request(app.getHttpServer()).get(`/api/v1${url}`);
    let kategorien: { id: string; slug: string; parentId: string | null; name: string }[];
    const kat = (slug: string) => kategorien.find((k) => k.slug === slug)!;

    beforeAll(async () => {
      kategorien = (await get('/catalog/categories').expect(200)).body;
    });

    it('returns a two-level hierarchy without inactive categories', () => {
      expect(kategorien.filter((k) => k.parentId === null)).toHaveLength(7);
      expect(kat('rollatoren').parentId).toBe(kat('mobil-bleiben').id);
      expect(kategorien.some((k) => k.slug === 'alt-selbstzahler')).toBe(false);
    });

    it('includes subcategory products when filtering by a main category', async () => {
      const res = await get(`/products?categoryId=${kat('mobil-bleiben').id}`).expect(200);
      const ids = res.body.map((p: { id: string }) => p.id);
      expect(ids).toEqual(expect.arrayContaining([PRODUKT.rollatorLeicht, '40000000-0000-0000-0000-000000000001']));
    });

    it('finds products by synonym, umlaut spelling and typo', async () => {
      for (const q of ['Gehwagen', 'Rolator', 'rollstuehle', 'Rollstühle']) {
        const res = await get(`/products?q=${encodeURIComponent(q)}`).expect(200);
        expect({ q, treffer: res.body.length > 0 }).toEqual({ q, treffer: true });
      }
      const exakt = await get(`/products?q=${encodeURIComponent('Outdoor-Rollator')}`).expect(200);
      expect(exakt.body[0].id).toBe(PRODUKT.rollatorOutdoor);
    });

    it('returns an empty list for filler-only or unknown queries', async () => {
      expect((await get(`/products?q=${encodeURIComponent('ich suche etwas')}`).expect(200)).body).toEqual([]);
      expect((await get('/products?q=xyzxyz').expect(200)).body).toEqual([]);
    });

    it('filters by attributes validated against the domain definition', async () => {
      const rollatoren = kat('rollatoren').id;
      const draussen = await get(`/products?categoryId=${rollatoren}&filter[einsatzort]=aussen`).expect(200);
      expect(draussen.body.map((p: { id: string }) => p.id).sort()).toEqual([PRODUKT.rollatorLeicht, PRODUKT.rollatorOutdoor].sort());

      const leicht = await get(`/products?categoryId=${rollatoren}&filter[gewichtKg]=7`).expect(200);
      expect(leicht.body.map((p: { id: string }) => p.id)).toEqual([PRODUKT.rollatorLeicht]);

      const schwer = await get(`/products?categoryId=${rollatoren}&filter[belastbarkeitKg]=150&filter[faltbar]=true`).expect(200);
      expect(schwer.body.map((p: { id: string }) => p.id)).toEqual([PRODUKT.rollatorOutdoor]);

      const guenstig = await get(`/products?categoryId=${rollatoren}&filter[preisEuro]=25`).expect(200);
      expect(guenstig.body.map((p: { id: string }) => p.id)).not.toContain(PRODUKT.rollatorWohnung);

      await get(`/products?categoryId=${rollatoren}&filter[farbe]=rot`).expect(400);
      await get(`/products?categoryId=${rollatoren}&filter[einsatzort]=mond`).expect(400);
      await get('/products?filter[faltbar]=true').expect(400);
    });

    it('resolves Bedarf and Krankheitsbild ids without a session', async () => {
      const duschen = await get('/products?bedarfId=duschen').expect(200);
      expect(duschen.body.length).toBeGreaterThan(0);
      expect(duschen.body.every((p: { kategorie: string }) => ['Duschhilfen', 'Badewannenhilfen'].includes(p.kategorie))).toBe(true);
      await get('/products?bedarfId=gibt-es-nicht').expect(400);

      const mobilitaet = await get('/products?krankheitsbildId=mobilitaet').expect(200);
      expect(mobilitaet.body.some((p: { id: string }) => p.id === PRODUKT.rollatorLeicht)).toBe(true);
    });

    it('paginates with limit and cursor', async () => {
      const alle = (await get('/products').expect(200)).body;
      const seite1 = (await get('/products?limit=5').expect(200)).body;
      const seite2 = (await get('/products?limit=5&cursor=5').expect(200)).body;
      expect(seite1.map((p: { id: string }) => p.id)).toEqual(alle.slice(0, 5).map((p: { id: string }) => p.id));
      expect(seite2.map((p: { id: string }) => p.id)).toEqual(alle.slice(5, 10).map((p: { id: string }) => p.id));
      await get('/products?limit=-1').expect(400);
    });

    it('returns the detail shape with attributes, variants and no images until a base URL exists', async () => {
      const res = await get(`/products/${PRODUKT.rollatorLeicht}`).expect(200);
      expect(res.body).toMatchObject({
        id: PRODUKT.rollatorLeicht,
        artikelnummer: 'MT-RL-ALU',
        kategorieSlug: 'rollatoren',
        verfuegbar: true,
        attribute: { faltbar: true },
        bilder: [],
      });
      expect(res.body.varianten).toHaveLength(2);
      await get('/products/kein-uuid').expect(400);
    });

    it('groups related products and hides variant-incompatible spare parts', async () => {
      const ohne = (await get(`/products/${PRODUKT.rollatorLeicht}/related`).expect(200)).body;
      expect(ohne.zubehoer.map((p: { id: string }) => p.id)).toContain(PRODUKT.tasche);
      expect(ohne.ersatzteil).toEqual([]);
      expect(ohne.dienstleistung.length).toBe(1);

      const detail = (await get(`/products/${PRODUKT.rollatorLeicht}`).expect(200)).body;
      const [v54, v62] = [...detail.varianten].sort((a: { sku: string }, b: { sku: string }) => a.sku.localeCompare(b.sku));
      const passend = (await get(`/products/${PRODUKT.rollatorLeicht}/related?variantId=${v54.id}`).expect(200)).body;
      expect(passend.ersatzteil.map((p: { id: string }) => p.id)).toEqual([PRODUKT.bremsset]);
      const unpassend = (await get(`/products/${PRODUKT.rollatorLeicht}/related?variantId=${v62.id}`).expect(200)).body;
      expect(unpassend.ersatzteil).toEqual([]);

      await get(`/products/${PRODUKT.rollatorOutdoor}/related?variantId=${v54.id}`).expect(400);
    });

    it('resolves Ratgeber entries product → category → parent category', async () => {
      const res = await get(`/qa?productId=${PRODUKT.rollatorOutdoor}`).expect(200);
      const slugs = res.body.map((e: { slug: string }) => e.slug);
      // Rollatoren-Link (Unterkategorie) und Mobil-bleiben-Link (Elternkategorie).
      expect(slugs).toEqual(expect.arrayContaining(['zahlt-die-kasse-einen-rollator', 'was-ist-die-gesetzliche-zuzahlung']));
      // Produktspezifisch für einen anderen Rollator — erscheint hier nicht.
      expect(slugs).not.toContain('rollator-bremsen-pruefen');

      const direkt = await get(`/qa?productId=${PRODUKT.rollatorLeicht}`).expect(200);
      expect(direkt.body[0].slug).toBe('rollator-bremsen-pruefen');
    });

    it('lists Ratgeber entries by Bedarf, Krankheitsbild and text', async () => {
      expect((await get('/qa?bedarfId=duschen').expect(200)).body.map((e: { slug: string }) => e.slug)).toContain('duschhocker-oder-duschstuhl');
      expect((await get('/qa?krankheitsbildId=inkontinenz').expect(200)).body.map((e: { slug: string }) => e.slug)).toContain(
        'inkontinenzartikel-monatsbedarf',
      );
      expect((await get(`/qa?q=${encodeURIComponent('Zuzahlung')}`).expect(200)).body.length).toBeGreaterThan(0);
      await get('/qa').expect(400);
      await get('/qa?bedarfId=duschen&q=x').expect(400);
    });

    it('returns a Ratgeber entry with sources and linked products', async () => {
      const res = await get('/qa/zahlt-die-kasse-einen-rollator').expect(200);
      expect(res.body.quellen.length).toBeGreaterThan(0);
      expect(res.body.geprueftAm).toBeNull();
      expect(res.body.produkte.length).toBeGreaterThan(0);
      await get('/qa/gibt-es-nicht').expect(404);
    });
  });
});
