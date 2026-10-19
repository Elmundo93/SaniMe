import 'dotenv/config';
import { and, eq, inArray } from 'drizzle-orm';
import { createDatabase, createPool } from '../client';
import { catalogCategories, qaEntries, qaEntryLinks } from '../schema';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';
import { QA_EINTRAEGE } from './qa.seed-data';

// Ratgeber-Inhalte als versionierte Seed-Datei statt CMS — Upsert per slug,
// Verknüpfungen werden pro Eintrag komplett neu geschrieben (die Seed-Datei ist
// die Wahrheit). Läuft nach catalog.seed.ts, weil Kategorie-Links über slug
// aufgelöst werden.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist erforderlich');
  }
  const pool = createPool(databaseUrl);
  const db = createDatabase(pool);
  const org = DEFAULT_ORGANIZATION_ID;

  const slugs = [...new Set(QA_EINTRAEGE.flatMap((e) => e.links.map((l) => l.categorySlug).filter((s): s is string => !!s)))];
  const kategorien = await db
    .select({ id: catalogCategories.id, slug: catalogCategories.slug })
    .from(catalogCategories)
    .where(and(eq(catalogCategories.organizationId, org), inArray(catalogCategories.slug, slugs)));
  const kategorieId = new Map(kategorien.map((k) => [k.slug, k.id]));

  for (const [index, e] of QA_EINTRAEGE.entries()) {
    const values = {
      organizationId: org,
      slug: e.slug,
      frage: e.frage,
      kurzantwort: e.kurzantwort,
      antwort: e.antwort,
      quellen: e.quellen,
      sortOrder: index,
      updatedAt: new Date(),
    };
    const [eintrag] = await db
      .insert(qaEntries)
      .values(values)
      .onConflictDoUpdate({ target: [qaEntries.organizationId, qaEntries.slug], set: values })
      .returning({ id: qaEntries.id });

    await db.delete(qaEntryLinks).where(eq(qaEntryLinks.qaEntryId, eintrag.id));
    await db.insert(qaEntryLinks).values(
      e.links.map((l) => {
        const categoryId = l.categorySlug ? kategorieId.get(l.categorySlug) : undefined;
        if (l.categorySlug && !categoryId) {
          throw new Error(`Ratgeber ${e.slug}: Kategorie ${l.categorySlug} nicht geseedet`);
        }
        return {
          organizationId: org,
          qaEntryId: eintrag.id,
          productId: l.productId ?? null,
          categoryId: categoryId ?? null,
          bedarfId: l.bedarfId ?? null,
          krankheitsbildId: l.krankheitsbildId ?? null,
        };
      }),
    );
  }

  await pool.end();
  console.log('Ratgeber-Platzhalterdaten geseedet.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
