import { scrub } from './scrub';

describe('scrub', () => {
  it('redacts sensitive keys', () => {
    const result = scrub({ email: 'a@b.de', password: 'geheim123' }) as Record<string, unknown>;
    expect(result.email).toBe('a@b.de');
    expect(result.password).toBe('[REDACTED]');
  });

  it('redacts nested sensitive keys', () => {
    const result = scrub({ patient: { name: 'Max' }, ok: true }) as Record<string, unknown>;
    expect(result.patient).toBe('[REDACTED]');
    expect(result.ok).toBe(true);
  });

  it('scrubs sensitive keys inside array elements', () => {
    const result = scrub([{ token: 'abc' }, { count: 1 }]) as Record<string, unknown>[];
    expect(result[0].token).toBe('[REDACTED]');
    expect(result[1].count).toBe(1);
  });

  it('passes through primitives unchanged', () => {
    expect(scrub('hello')).toBe('hello');
    expect(scrub(42)).toBe(42);
    expect(scrub(null)).toBe(null);
  });

  // Layer 4: one case per token added to the denylist — the process going
  // forward for every newly-discovered sensitive field name.
  it.each(['krankenkassennummer', 'svnr', 'sv_nr', 'sozialversicherungsnummer'])('redacts the %s key', (key) => {
    const result = scrub({ [key]: 'A123456789' }) as Record<string, unknown>;
    expect(result[key]).toBe('[REDACTED]');
  });

  it('scrubs a Sentry-breadcrumb-shaped object the same way (beforeBreadcrumb reuses scrub directly)', () => {
    const breadcrumb = { category: 'http', data: { url: 'https://api.example.com/x', patient: 'Max Mustermann' } };
    const result = scrub(breadcrumb) as { category: string; data: { patient: unknown } };
    expect(result.category).toBe('http');
    expect(result.data.patient).toBe('[REDACTED]');
  });
});
