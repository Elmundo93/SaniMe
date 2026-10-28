import {
  base32Decode,
  base32Encode,
  entschluesseleGeheimnis,
  erzeugeTotpGeheimnis,
  pruefeTotpCode,
  totpCode,
  verschluesseleGeheimnis,
} from './admin-totp';

// RFC 6238 Anhang B, SHA-1: Geheimnis "12345678901234567890", 8 Stellen.
const RFC_GEHEIMNIS = base32Encode(Buffer.from('12345678901234567890'));

describe('admin-totp', () => {
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ])('liefert den RFC-6238-Testvektor für t=%i', (sekunden, erwartet) => {
    expect(totpCode(RFC_GEHEIMNIS, sekunden * 1000, 8)).toBe(erwartet);
  });

  it('kodiert Base32 verlustfrei hin und zurück', () => {
    const geheimnis = erzeugeTotpGeheimnis();
    expect(base32Encode(base32Decode(geheimnis))).toBe(geheimnis);
    expect(geheimnis).toHaveLength(32);
  });

  it('akzeptiert den aktuellen und den benachbarten Code, nicht aber ältere', () => {
    const jetzt = 1_800_000_000_000;
    const geheimnis = erzeugeTotpGeheimnis();
    expect(pruefeTotpCode(geheimnis, totpCode(geheimnis, jetzt), jetzt)).toBe(true);
    expect(pruefeTotpCode(geheimnis, totpCode(geheimnis, jetzt - 30_000), jetzt)).toBe(true);
    expect(pruefeTotpCode(geheimnis, totpCode(geheimnis, jetzt - 90_000), jetzt)).toBe(false);
    expect(pruefeTotpCode(geheimnis, '12345', jetzt)).toBe(false);
    expect(pruefeTotpCode(geheimnis, 'abcdef', jetzt)).toBe(false);
  });

  it('verschlüsselt das Geheimnis und erkennt Manipulation', () => {
    const verschluesselt = verschluesseleGeheimnis('GEHEIMNIS', 'server-secret');
    expect(verschluesselt).not.toContain('GEHEIMNIS');
    expect(entschluesseleGeheimnis(verschluesselt, 'server-secret')).toBe('GEHEIMNIS');
    expect(() => entschluesseleGeheimnis(verschluesselt, 'anderes-secret')).toThrow();
  });
});
