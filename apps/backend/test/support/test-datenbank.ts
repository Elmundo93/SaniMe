// Tests laufen gegen eine eigene Datenbank (<name>_test auf demselben
// Postgres), nie gegen die Dev-Datenbank — vorher landeten Test-Versorgungen
// und -Kunden zwischen den Daten, mit denen man die App von Hand testet.
// TEST_DATABASE_URL überschreibt die Ableitung (z. B. in CI).
export function testDatenbankUrl(devUrl: string | undefined): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (!devUrl) throw new Error('DATABASE_URL fehlt — apps/backend/.env anlegen (siehe .env.example)');
  const url = new URL(devUrl);
  const name = url.pathname.replace(/^\//, '') || 'sanime';
  url.pathname = `/${name.endsWith('_test') ? name : `${name}_test`}`;
  return url.toString();
}
