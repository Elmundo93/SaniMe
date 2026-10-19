// Denylist of field-name patterns that must never reach a log line, even
// though no health-data field flows through Layer 1 yet — the scrubbing
// mechanism has to exist before HealthData does, per work/Backendsprint.md
// Principle 13 ("Sentry beforeSend-Scrubbing ab der ersten Route").
// Key-name matching only — this can never be "complete" once and for all
// (a denylist can't anticipate every future field name). The going-forward
// process (Layer 4) is: add the token here plus a scrub.spec.ts case the
// moment a new sensitive field is discovered, not attempt exhaustiveness
// up front.
const SENSITIVE_KEY_PATTERN =
  /(password|passwort|token|secret|geheim|versichertennr|versicherten_nr|krankenkassennummer|svnr|sv_nr|sozialversicherungsnummer|diagnose|krankenkasse|patient|rezept|prescription|insurance|query_string)/i;

// Katalogsuche: Suchbegriffe, Bedarfs-/Krankheitsbild-IDs und Filter stehen im
// Query-String (`/products?q=inkontinenz`) und sind potenziell Gesundheitsdaten.
// Ein Wert-basierter Filter statt Key-Denylist, weil URLs unter harmlosen Keys
// (`url`, `path`, `message`) auftauchen. Maskiert werden alle Query-Werte — eine
// Allowlist harmloser Parameter wäre die nächste Stelle, die beim Hinzufügen
// eines neuen Filters vergessen wird.
const URL_MIT_QUERY = /\?[^\s]*=/;

export function maskiereQuery(text: string): string {
  if (!URL_MIT_QUERY.test(text)) return text;
  return text.replace(/([?&][^=&#\s]+)=[^&#\s]*/g, '$1=[REDACTED]');
}

export function scrub(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : scrub(val),
      ]),
    );
  }
  if (typeof value === 'string') {
    return maskiereQuery(value);
  }
  return value;
}
