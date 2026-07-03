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
});
