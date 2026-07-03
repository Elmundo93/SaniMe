// Denylist of field-name patterns that must never reach a log line, even
// though no health-data field flows through Layer 1 yet — the scrubbing
// mechanism has to exist before HealthData does, per work/Backendsprint.md
// Principle 13 ("Sentry beforeSend-Scrubbing ab der ersten Route").
const SENSITIVE_KEY_PATTERN =
  /(password|passwort|token|secret|geheim|versichertennr|versicherten_nr|diagnose|krankenkasse|patient|rezept|prescription|insurance)/i;

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
  return value;
}
