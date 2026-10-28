import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsSender } from '../ports/sms-sender.port';

// Kein Anbieter konfiguriert: in Dev/Test nur protokollieren (Nummer
// gekürzt), in Produktion laut scheitern — nie einen Versand vortäuschen.
@Injectable()
export class DevSmsSender implements SmsSender {
  readonly echterVersand = false;
  private readonly logger = new Logger(DevSmsSender.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string): Promise<void> {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new NotImplementedException('Kein SMS-Anbieter konfiguriert (SEVEN_API_KEY)');
    }
    this.logger.log(`[dev] SMS an …${to.slice(-3)} nicht versendet (kein Anbieter konfiguriert)`);
  }
}
