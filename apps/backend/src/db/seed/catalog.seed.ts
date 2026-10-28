import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { createDatabase, createPool } from '../client';
import {
  catalogCategories,
  manufacturers,
  productRelations,
  products,
  productVariants,
  supplierProducts,
  suppliers,
} from '../schema';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';
import { BEZIEHUNGEN, KATEGORIEN, MANUFACTURERS, PRODUKTE, SUPPLIER_ID, VARIANTEN } from './catalog.seed-data';
import {
  ENTWICKLUNG_BEZIEHUNGEN,
  ENTWICKLUNG_MANUFACTURERS,
  ENTWICKLUNG_PRODUKTE,
  ENTWICKLUNG_VARIANTEN,
  mitEntwicklungskatalog,
} from './catalog.entwicklung.seed-data';

// Katalog v1 (herstellerneutrale Selbstzahler-Artikel, Richtpreise) plus — außer
// in Produktion — die Entwicklungs-Platzhalter. Die Daten selbst stehen in
// catalog.seed-data.ts / catalog.entwicklung.seed-data.ts (dort auch gegen
// @sanime/domain getestet); hier nur das Schreiben. Durchgehend Upserts statt
// DoNothing: eine vor dem Katalogausbau geseedete DB hat Kategorien/Produkte
// schon (gleiche UUIDs) — die müssen nachgezogen werden.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist erforderlich');
  }
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);
  const org = DEFAULT_ORGANIZATION_ID;
  const entwicklung = mitEntwicklungskatalog();
  const hersteller = entwicklung ? [...MANUFACTURERS, ...ENTWICKLUNG_MANUFACTURERS] : MANUFACTURERS;
  const produkte = entwicklung ? [...PRODUKTE, ...ENTWICKLUNG_PRODUKTE] : PRODUKTE;
  const varianten = entwicklung ? [...VARIANTEN, ...ENTWICKLUNG_VARIANTEN] : VARIANTEN;
  const beziehungen = entwicklung ? [...BEZIEHUNGEN, ...ENTWICKLUNG_BEZIEHUNGEN] : BEZIEHUNGEN;

  const idBySlug = new Map(KATEGORIEN.map((k) => [k.slug, k.id]));
  // Hauptkategorien zuerst — Unterkategorien verweisen per parent_id auf sie.
  const sortiert = [...KATEGORIEN].sort((a, b) => Number(a.parentSlug !== null) - Number(b.parentSlug !== null));
  for (const [index, k] of sortiert.entries()) {
    const values = {
      id: k.id,
      organizationId: org,
      parentId: k.parentSlug ? idBySlug.get(k.parentSlug)! : null,
      name: k.name,
      slug: k.slug,
      beschreibung: k.beschreibung ?? null,
      icon: k.icon,
      sortOrder: index,
      isActive: k.isActive ?? true,
      krankheitsbildId: k.krankheitsbildId ?? null,
    };
    await db.insert(catalogCategories).values(values).onConflictDoUpdate({ target: catalogCategories.id, set: values });
  }

  await db
    .insert(manufacturers)
    .values(hersteller.map((m) => ({ ...m, organizationId: org })))
    .onConflictDoUpdate({ target: manufacturers.id, set: { name: sql`excluded.name` } });

  await db
    .insert(suppliers)
    .values({ id: SUPPLIER_ID, organizationId: org, name: 'SaniMe-Pilotlieferant (Platzhalter)' })
    .onConflictDoNothing();

  for (const p of produkte) {
    const values = {
      id: p.id,
      organizationId: org,
      categoryId: idBySlug.get(p.kategorieSlug)!,
      manufacturerId: p.herstellerId,
      name: p.name,
      // null = Selbstzahler-Artikel, keine Krankenkassen-Beteiligung — siehe
      // istAbschlussfaehig in @sanime/domain.
      hilfsmittelnummer: p.hilfsmittelnummer,
      description: p.beschreibung,
      kurzbeschreibung: p.kurzbeschreibung,
      artikelnummer: p.artikelnummer,
      features: p.merkmale,
      attributes: p.attribute ?? {},
      requiresApproval: p.requiresApproval,
      vatRatePercent: p.mwstSatz ?? 19,
    };
    await db.insert(products).values(values).onConflictDoUpdate({ target: products.id, set: values });

    const angebot = {
      organizationId: org,
      supplierId: SUPPLIER_ID,
      productId: p.id,
      deliveryTimeDays: p.angebot.lieferzeitTage,
      // Bei Selbstzahlern der volle Preis (kein Festbetrag-Split) — Richtpreis.
      customerCopayCents: p.angebot.copayCents,
      selfPayPriceCents: p.angebot.selbstzahlerPreisCents ?? null,
      availability: p.angebot.availability ?? 'available',
    };
    await db
      .insert(supplierProducts)
      .values(angebot)
      .onConflictDoUpdate({
        target: [supplierProducts.supplierId, supplierProducts.productId],
        set: {
          deliveryTimeDays: sql`excluded.delivery_time_days`,
          customerCopayCents: sql`excluded.customer_copay_cents`,
          selfPayPriceCents: sql`excluded.self_pay_price_cents`,
          availability: sql`excluded.availability`,
        },
      });
  }

  for (const v of varianten) {
    const values = { id: v.id, organizationId: org, productId: v.productId, sku: v.sku, attributes: v.attribute };
    await db.insert(productVariants).values(values).onConflictDoUpdate({ target: productVariants.id, set: values });
  }

  if (beziehungen.length > 0) {
    await db
      .insert(productRelations)
      .values(beziehungen.map((b) => ({ ...b, organizationId: org })))
      .onConflictDoNothing();
  }

  await pool.end();
  console.log(`Katalog geseedet: ${produkte.length} Produkte${entwicklung ? ' (inkl. Entwicklungs-Platzhalter)' : ''}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
