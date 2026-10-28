// globalSetup beider Jest-Konfigurationen: legt die Testdatenbank bei Bedarf
// an, spielt alle Migrationen ein und seedet sie (idempotent, Upserts) — einmal
// pro Testlauf.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import { testDatenbankUrl } from './test-datenbank';

const BACKEND = path.resolve(__dirname, '../..');
const SEEDS = ['organizations', 'catalog', 'qa', 'customers', 'retention-policy'];

export default async function globalSetup() {
  config({ path: path.join(BACKEND, '.env') });
  const devUrl = process.env.DATABASE_URL;
  const testUrl = testDatenbankUrl(devUrl);
  if (testUrl === devUrl) throw new Error('Testdatenbank darf nicht die Dev-Datenbank sein');

  const name = new URL(testUrl).pathname.slice(1);
  const verwaltung = new URL(testUrl);
  verwaltung.pathname = '/postgres';
  const admin = new Client({ connectionString: verwaltung.toString() });
  await admin.connect();
  const vorhanden = await admin.query('select 1 from pg_database where datname = $1', [name]);
  if (vorhanden.rowCount === 0) await admin.query(`create database "${name.replace(/"/g, '')}"`);
  await admin.end();

  const client = new Client({ connectionString: testUrl });
  await client.connect();
  await migrate(drizzle(client), { migrationsFolder: path.join(BACKEND, 'drizzle/migrations') });
  await client.end();

  for (const seed of SEEDS) {
    execFileSync('npx', ['tsx', `src/db/seed/${seed}.seed.ts`], {
      cwd: BACKEND,
      env: { ...process.env, DATABASE_URL: testUrl, DATENBANK_FUER_TESTS_GESETZT: '1' },
      stdio: 'ignore',
    });
  }
}
