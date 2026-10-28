// setupFiles beider Jest-Konfigurationen: läuft vor jeder Testdatei, also
// vor deren `import 'dotenv/config'` — das überschreibt eine schon gesetzte
// DATABASE_URL nicht mehr.
import { config } from 'dotenv';
import { testDatenbankUrl } from './test-datenbank';

config();
if (!process.env.DATENBANK_FUER_TESTS_GESETZT) {
  process.env.DATABASE_URL = testDatenbankUrl(process.env.DATABASE_URL);
  process.env.DATENBANK_FUER_TESTS_GESETZT = '1';
}
