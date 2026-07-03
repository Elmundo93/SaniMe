import 'dotenv/config';
import { createDatabase, createPool } from '../client';
import { catalogCategories, manufacturers, products, supplierProducts, suppliers } from '../schema';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';

// Placeholder catalog data for the pilot — per CLAUDE.md, never hardcode real
// manufacturer/pricing/Hilfsmittelnummer data as if it were production.
const CATEGORY_ID = '10000000-0000-0000-0000-000000000001';
const MANUFACTURER_IDS = {
  mobiltech: '20000000-0000-0000-0000-000000000001',
  aktivcare: '20000000-0000-0000-0000-000000000002',
};
const SUPPLIER_ID = '30000000-0000-0000-0000-000000000001';
const PRODUCT_IDS = {
  p1: '40000000-0000-0000-0000-000000000001',
  p2: '40000000-0000-0000-0000-000000000002',
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist erforderlich');
  }
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);

  await db
    .insert(catalogCategories)
    .values({ id: CATEGORY_ID, organizationId: DEFAULT_ORGANIZATION_ID, name: 'Rollstuhl' })
    .onConflictDoNothing();

  await db
    .insert(manufacturers)
    .values([
      { id: MANUFACTURER_IDS.mobiltech, organizationId: DEFAULT_ORGANIZATION_ID, name: 'MobilTech (Platzhalter)' },
      { id: MANUFACTURER_IDS.aktivcare, organizationId: DEFAULT_ORGANIZATION_ID, name: 'AktivCare (Platzhalter)' },
    ])
    .onConflictDoNothing();

  await db
    .insert(suppliers)
    .values({ id: SUPPLIER_ID, organizationId: DEFAULT_ORGANIZATION_ID, name: 'SaniMe-Pilotlieferant (Platzhalter)' })
    .onConflictDoNothing();

  await db
    .insert(products)
    .values([
      {
        id: PRODUCT_IDS.p1,
        organizationId: DEFAULT_ORGANIZATION_ID,
        categoryId: CATEGORY_ID,
        manufacturerId: MANUFACTURER_IDS.mobiltech,
        name: 'Rollstuhl Aktiv SB 40 — Basisversorgung (Platzhalter)',
        hilfsmittelnummer: '00.00.00.0001',
        description: 'Leichter Standardrollstuhl, faltbar, Sitzbreite 40 cm.',
        features: ['Faltbar', 'Leichtgewicht 13 kg', 'Bremsgriffe', 'Fußrasten verstellbar'],
        requiresApproval: true,
      },
      {
        id: PRODUCT_IDS.p2,
        organizationId: DEFAULT_ORGANIZATION_ID,
        categoryId: CATEGORY_ID,
        manufacturerId: MANUFACTURER_IDS.aktivcare,
        name: 'Rollstuhl Komfort Plus SB 40 (Platzhalter)',
        hilfsmittelnummer: '00.00.00.0012',
        description: 'Komfortrollstuhl mit verbesserter Polsterung und einstellbarer Rückenlehne.',
        features: ['Faltbar', 'Ergonomische Rückenlehne', 'Anti-Dekubituspolsterung'],
        requiresApproval: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(supplierProducts)
    .values([
      {
        organizationId: DEFAULT_ORGANIZATION_ID,
        supplierId: SUPPLIER_ID,
        productId: PRODUCT_IDS.p1,
        deliveryTimeDays: 3,
        customerCopayCents: 1000,
        availability: 'available',
      },
      {
        organizationId: DEFAULT_ORGANIZATION_ID,
        supplierId: SUPPLIER_ID,
        productId: PRODUCT_IDS.p2,
        deliveryTimeDays: 5,
        customerCopayCents: 1000,
        availability: 'available',
      },
    ])
    .onConflictDoNothing();

  await pool.end();
  console.log('Catalog-Platzhalterdaten geseedet.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
