import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'crypto';

// Zweiter Faktor für den Admin-Login: TOTP nach RFC 6238 (30 s, 6 Ziffern,
// SHA-1 — das, was jede Authenticator-App versteht). Bewusst ohne Bibliothek:
// ~40 Zeilen, vollständig durch die RFC-Testvektoren abgedeckt (admin-totp.spec.ts).

const SCHRITT_SEKUNDEN = 30;
const STELLEN = 6;
// ±1 Schritt: Uhren von Handy und Server laufen nie exakt gleich.
const TOLERANZ_SCHRITTE = 1;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error('Ungültiges Base32-Zeichen');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function erzeugeTotpGeheimnis(): string {
  return base32Encode(randomBytes(20));
}

export function totpCode(geheimnis: string, zeitpunktMs: number, stellen = STELLEN): string {
  const zaehler = Math.floor(zeitpunktMs / 1000 / SCHRITT_SEKUNDEN);
  const nachricht = Buffer.alloc(8);
  nachricht.writeBigUInt64BE(BigInt(zaehler));
  const hmac = createHmac('sha1', base32Decode(geheimnis)).update(nachricht).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const zahl = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** stellen;
  return zahl.toString().padStart(stellen, '0');
}

export function pruefeTotpCode(geheimnis: string, code: string, zeitpunktMs = Date.now()): boolean {
  const eingabe = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(eingabe)) return false;
  for (let abweichung = -TOLERANZ_SCHRITTE; abweichung <= TOLERANZ_SCHRITTE; abweichung++) {
    const erwartet = totpCode(geheimnis, zeitpunktMs + abweichung * SCHRITT_SEKUNDEN * 1000);
    if (timingSafeEqual(Buffer.from(erwartet), Buffer.from(eingabe))) return true;
  }
  return false;
}

// otpauth://-Link für den QR-Code der Authenticator-App.
export function otpauthUrl(geheimnis: string, konto: string): string {
  const aussteller = 'SaniMe Admin';
  return `otpauth://totp/${encodeURIComponent(`${aussteller}:${konto}`)}?secret=${geheimnis}&issuer=${encodeURIComponent(aussteller)}&algorithm=SHA1&digits=${STELLEN}&period=${SCHRITT_SEKUNDEN}`;
}

// Das Geheimnis liegt nur verschlüsselt in admin_users (AES-256-GCM). Der
// Schlüssel wird aus ADMIN_JWT_SECRET abgeleitet — wer das rotiert, muss die
// 2FA aller Admins neu einrichten lassen (totp_* auf NULL setzen).
function schluessel(serverGeheimnis: string): Buffer {
  return Buffer.from(hkdfSync('sha256', serverGeheimnis, 'sanime-admin', 'totp-secret-v1', 32));
}

export function verschluesseleGeheimnis(geheimnis: string, serverGeheimnis: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', schluessel(serverGeheimnis), iv);
  const daten = Buffer.concat([cipher.update(geheimnis, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), daten.toString('base64')].join('.');
}

export function entschluesseleGeheimnis(verschluesselt: string, serverGeheimnis: string): string {
  const [version, iv, tag, daten] = verschluesselt.split('.');
  if (version !== 'v1' || !iv || !tag || !daten) throw new Error('Unbekanntes Format des 2FA-Geheimnisses');
  const decipher = createDecipheriv('aes-256-gcm', schluessel(serverGeheimnis), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(daten, 'base64')), decipher.final()]).toString('utf8');
}
