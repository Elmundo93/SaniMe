import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { scrub } from '../../../common/logging/scrub';
import type { NotificationMessage, NotificationProvider } from '../ports/notification-provider.port';

// Follows DevCodeVerificationProvider's exact pattern (dev-code-verification.provider.ts):
// real logic, never fakes delivery, throws in production instead of silently
// "succeeding". Difference worth noting: sendCode() is awaited synchronously
// in a customer HTTP request, so its production throw surfaces immediately;
// this runs inside a JobQueue handler (see notification-send.job-handler.ts),
// so a production throw here means the notifications row lands at
// status:'failed' after retries and gets logged — an ops-visible dead
// letter, not a blocked request. Same "never fake delivery" discipline,
// different visible surface.
@Injectable()
export class LoggingNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(LoggingNotificationProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: NotificationMessage): Promise<void> {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      throw new NotImplementedException('Kein produktiver Notification-Provider konfiguriert');
    }
    this.logger.log(`[dev] Notification (${message.channel} -> ${message.target}): ${JSON.stringify(scrub(message))}`);
  }
}
