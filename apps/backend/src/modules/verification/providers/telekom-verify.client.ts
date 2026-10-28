import { createPrivateKey, randomUUID, sign, type KeyObject } from 'node:crypto';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

export interface TelekomVerifyKonfiguration {
  applicationId: string;
  // Inhalt der private.key aus der Application im Telekom-Developer-Dashboard.
  privateKey: string;
  baseUrl: string;
  // Prüfung über das Mobilfunknetz ohne SMS — erst einschalten, wenn die
  // deutschen Netzbetreiber die App freigegeben haben (Network Registry).
  stillePruefung: boolean;
  // Nur zum Testen ohne Freigabe: Ergebnis hängt an der Endziffer der Nummer.
  sandbox: boolean;
}

export interface VerifyStart {
  requestId: string;
  // Nur bei stiller Prüfung: die App ruft sie über Mobilfunk auf und erhält
  // den Code, ohne dass eine SMS nötig ist.
  checkUrl?: string;
}

const MARKE = 'SaniMe';

// Telekom Verify API v2 (technisch die Vonage-Plattform): eine Prüfung mit
// Kanal-Reihenfolge stille Prüfung → SMS. Den Code erzeugt und prüft die
// Telekom; wir halten nur die request_id.
export class TelekomVerifyClient {
  private readonly logger = new Logger(TelekomVerifyClient.name);
  private readonly key: KeyObject;

  constructor(private readonly konfig: TelekomVerifyKonfiguration) {
    this.key = createPrivateKey(konfig.privateKey);
  }

  get stillePruefung(): boolean {
    return this.konfig.stillePruefung;
  }

  async start(e164: string): Promise<VerifyStart> {
    const to = e164.replace(/^\+/, '');
    const workflow = [
      ...(this.konfig.stillePruefung ? [{ channel: 'silent_auth', to, ...(this.konfig.sandbox ? { sandbox: true } : {}) }] : []),
      { channel: 'sms', to },
    ];
    const res = await this.anfrage('POST', '/v2/verify', {
      brand: MARKE,
      locale: 'de-de',
      code_length: 6,
      // Kurz, weil die App bei gescheiterter stiller Prüfung sofort die SMS
      // anfordert (naechsterKanal) — das ist nur die Obergrenze.
      channel_timeout: 60,
      workflow,
    });
    if (res.status === 409) {
      throw new HttpException('Für diese Nummer läuft schon eine Bestätigung. Bitte nutze den Code, den du bekommen hast.', HttpStatus.CONFLICT);
    }
    if (!res.ok) throw this.fehler('Start', res.status, res.body);
    return { requestId: String(res.body.request_id), checkUrl: res.body.check_url ? String(res.body.check_url) : undefined };
  }

  async pruefe(requestId: string, code: string): Promise<boolean> {
    const res = await this.anfrage('POST', `/v2/verify/${encodeURIComponent(requestId)}`, { code });
    if (res.ok) return res.body.status === 'completed';
    // Falscher, abgelaufener oder schon verbrauchter Code — kein Serverfehler.
    if ([400, 404, 409, 410, 422].includes(res.status)) return false;
    throw this.fehler('Prüfung', res.status, res.body);
  }

  // Stille Prüfung ging nicht (z. B. WLAN) → sofort die SMS statt nach Ablauf
  // des Kanal-Timeouts.
  async naechsterKanal(requestId: string): Promise<void> {
    const res = await this.anfrage('POST', `/v2/verify/${encodeURIComponent(requestId)}/next_workflow`);
    if (!res.ok && res.status !== 409) throw this.fehler('Kanalwechsel', res.status, res.body);
  }

  private async anfrage(method: string, pfad: string, body?: unknown) {
    const res = await fetch(`${this.konfig.baseUrl}${pfad}`, {
      method,
      headers: { Authorization: `Bearer ${this.jwt()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }
    return { ok: res.ok, status: res.status, body: json };
  }

  // Nur Status und Fehlertitel protokollieren — nie die Nummer.
  private fehler(schritt: string, status: number, body: Record<string, unknown>) {
    this.logger.warn(`Telekom Verify ${schritt} fehlgeschlagen: HTTP ${status} ${String(body.title ?? body.type ?? '')}`);
    return new HttpException(
      'Die Bestätigung deiner Telefonnummer ist gerade nicht möglich. Bitte versuche es in ein paar Minuten erneut.',
      HttpStatus.BAD_GATEWAY,
    );
  }

  // Application-JWT (RS256): application_id, iat, jti, exp — kurzlebig.
  private jwt(): string {
    const jetzt = Math.floor(Date.now() / 1000);
    const kopf = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const inhalt = b64(JSON.stringify({ application_id: this.konfig.applicationId, iat: jetzt, exp: jetzt + 300, jti: randomUUID() }));
    const signatur = sign('RSA-SHA256', Buffer.from(`${kopf}.${inhalt}`), this.key).toString('base64url');
    return `${kopf}.${inhalt}.${signatur}`;
  }
}

function b64(text: string): string {
  return Buffer.from(text).toString('base64url');
}

export function telekomVerifyKonfigurationAusEnv(get: (name: string) => string | undefined): TelekomVerifyKonfiguration | null {
  const applicationId = get('TELEKOM_VERIFY_APPLICATION_ID');
  const privateKey = get('TELEKOM_VERIFY_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!applicationId || !privateKey) return null;
  return {
    applicationId,
    privateKey,
    baseUrl: get('TELEKOM_VERIFY_BASE_URL') ?? 'https://api.nexmo.com',
    stillePruefung: get('TELEKOM_VERIFY_STILLE_PRUEFUNG') === 'true',
    sandbox: get('TELEKOM_VERIFY_SANDBOX') === 'true',
  };
}
