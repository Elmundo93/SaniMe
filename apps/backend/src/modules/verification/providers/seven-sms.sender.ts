import { Logger } from '@nestjs/common';
import type { SmsSender } from '../ports/sms-sender.port';

const SEVEN_SMS_URL = 'https://gateway.seven.io/api/sms';

// seven.io (Sitz in Deutschland, Verarbeitung in der EU). Der Inhalt ist nur
// der Code — keine Gesundheitsdaten, kein Produkt.
export class SevenSmsSender implements SmsSender {
  readonly echterVersand = true;
  private readonly logger = new Logger(SevenSmsSender.name);

  constructor(
    private readonly apiKey: string,
    private readonly absender: string,
  ) {}

  async send(to: string, text: string): Promise<void> {
    const res = await fetch(SEVEN_SMS_URL, {
      method: 'POST',
      headers: { 'X-Api-Key': this.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to, text, from: this.absender }),
    });
    const antwort = (await res.json().catch(() => null)) as { success?: string } | null;
    // seven.io meldet Erfolg als success "100" (bzw. "101" bei Teilversand).
    if (!res.ok || !antwort || !['100', '101'].includes(String(antwort.success))) {
      this.logger.warn(`SMS-Versand fehlgeschlagen (HTTP ${res.status}, Code ${antwort?.success ?? 'unbekannt'})`);
      throw new Error('SMS konnte nicht versendet werden');
    }
  }
}
