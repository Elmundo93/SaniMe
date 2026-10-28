import { createPrivateKey, sign, type KeyObject } from 'node:crypto';
import { connect, constants, type ClientHttp2Session } from 'node:http2';
import { Logger } from '@nestjs/common';
import { UngueltigesZielError, type NotificationMessage, type NotificationProvider } from '../ports/notification-provider.port';

export interface ApnsKonfiguration {
  keyId: string;
  teamId: string;
  // Inhalt der .p8-Datei aus dem Apple-Developer-Konto (Keys → APNs).
  privateKey: string;
  bundleId: string;
  // Dev-Builds bekommen Sandbox-Tokens, TestFlight/App Store Produktions-Tokens.
  production: boolean;
}

// Apple erlaubt ein Provider-Token höchstens eine Stunde und lehnt zu häufige
// Erneuerung ab — 50 Minuten liegen sicher dazwischen.
const TOKEN_GUELTIG_MS = 50 * 60 * 1000;

// Gründe, aus denen ein Token nie wieder zugestellt werden kann.
const UNGUELTIGE_TOKEN_GRUENDE = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic']);

// Direkt an APNs statt über einen Push-Dienst eines Dritten: der Inhalt ist
// zwar neutral formuliert, aber jede Nachricht verrät, dass eine Person bei
// uns eine Versorgung hat — das bleibt zwischen uns und Apple. Andere Kanäle
// (E-Mail) und Android gehen an den Fallback.
export class ApnsNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(ApnsNotificationProvider.name);
  private readonly key: KeyObject;
  private token: { wert: string; erstellt: number } | null = null;
  private session: ClientHttp2Session | null = null;

  constructor(
    private readonly konfig: ApnsKonfiguration,
    private readonly fallback: NotificationProvider,
  ) {
    this.key = createPrivateKey(konfig.privateKey);
  }

  async send(message: NotificationMessage): Promise<void> {
    if (message.channel !== 'push') return this.fallback.send(message);

    const payload = JSON.stringify({
      aps: { alert: { title: message.title, body: message.body }, sound: 'default' },
      ...message.data,
    });
    const { status, grund } = await this.post(message.target, payload);
    if (status === 200) return;
    if (status === 410 || UNGUELTIGE_TOKEN_GRUENDE.has(grund)) throw new UngueltigesZielError(message.target);
    throw new Error(`APNs lehnte die Nachricht ab: ${status} ${grund}`);
  }

  private post(deviceToken: string, payload: string): Promise<{ status: number; grund: string }> {
    return new Promise((resolve, reject) => {
      const request = this.verbindung().request({
        [constants.HTTP2_HEADER_METHOD]: 'POST',
        [constants.HTTP2_HEADER_PATH]: `/3/device/${deviceToken}`,
        authorization: `bearer ${this.providerToken()}`,
        'apns-topic': this.konfig.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      });
      let status = 0;
      let antwort = '';
      request.setEncoding('utf8');
      request.on('response', (headers) => (status = Number(headers[constants.HTTP2_HEADER_STATUS])));
      request.on('data', (teil: string) => (antwort += teil));
      request.on('end', () => {
        let grund = '';
        try {
          grund = antwort ? (JSON.parse(antwort).reason ?? '') : '';
        } catch {
          grund = antwort;
        }
        resolve({ status, grund });
      });
      request.on('error', (error) => {
        this.session = null;
        reject(error);
      });
      request.end(payload);
    });
  }

  private verbindung(): ClientHttp2Session {
    if (this.session && !this.session.closed && !this.session.destroyed) return this.session;
    const host = this.konfig.production ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com';
    const session = connect(host);
    session.on('error', (error) => {
      this.logger.warn(`APNs-Verbindung getrennt: ${error.message}`);
      this.session = null;
    });
    session.on('close', () => (this.session = null));
    session.unref();
    this.session = session;
    return session;
  }

  // ES256-JWT nach Apples Vorgabe (kid im Header, iss = Team-ID, iat).
  private providerToken(): string {
    if (this.token && Date.now() - this.token.erstellt < TOKEN_GUELTIG_MS) return this.token.wert;
    const header = base64url(JSON.stringify({ alg: 'ES256', kid: this.konfig.keyId }));
    const claims = base64url(JSON.stringify({ iss: this.konfig.teamId, iat: Math.floor(Date.now() / 1000) }));
    const signatur = sign('sha256', Buffer.from(`${header}.${claims}`), { key: this.key, dsaEncoding: 'ieee-p1363' });
    const wert = `${header}.${claims}.${signatur.toString('base64url')}`;
    this.token = { wert, erstellt: Date.now() };
    return wert;
  }
}

function base64url(text: string): string {
  return Buffer.from(text).toString('base64url');
}

// Opt-in wie Sentry/Stripe: ohne vollständige APNS_*-Variablen bleibt es beim
// Logging-Provider. Der Schlüssel darf mit \n-Escapes in einer Zeile stehen.
export function apnsKonfigurationAusEnv(get: (name: string) => string | undefined): ApnsKonfiguration | null {
  const keyId = get('APNS_KEY_ID');
  const teamId = get('APNS_TEAM_ID');
  const privateKey = get('APNS_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!keyId || !teamId || !privateKey) return null;
  return {
    keyId,
    teamId,
    privateKey,
    bundleId: get('APNS_BUNDLE_ID') ?? 'de.sanime.app',
    production: get('APNS_PRODUCTION') === 'true',
  };
}
