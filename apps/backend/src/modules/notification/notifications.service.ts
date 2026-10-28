import { Inject, Injectable } from '@nestjs/common';
import { JOB_QUEUE, type JobQueue } from '../job-queue/ports/job-queue.port';
import { NotificationsRepository } from './notifications.repository';
import { PushTokensRepository } from './push-tokens.repository';
import type { NotificationChannel } from './ports/notification-provider.port';

export interface NotifyInput {
  organizationId: string;
  recipientType: 'customer' | 'admin';
  recipientId: string | null;
  channel: NotificationChannel;
  target: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Was auf dem Sperrbildschirm steht: nie Produkt, Kasse oder Diagnose — die
// Details sieht der Kunde erst in der App. data trägt nur Verweise (supplyId).
export interface KundenNachricht {
  title: string;
  body: string;
  data: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly pushTokens: PushTokensRepository,
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
  ) {}

  async notify(input: NotifyInput) {
    const row = await this.repository.create(input);
    await this.jobQueue.enqueue('notification.send', { notificationId: row.id });
    return row;
  }

  // Push an alle Geräte des Kunden; ohne registriertes Gerät passiert nichts
  // (die App zeigt den Stand beim nächsten Öffnen ohnehin an).
  async notifyCustomer(organizationId: string, customerId: string, nachricht: KundenNachricht) {
    const tokens = await this.pushTokens.listForCustomer(customerId);
    for (const t of tokens) {
      await this.notify({
        organizationId,
        recipientType: 'customer',
        recipientId: customerId,
        channel: 'push',
        target: t.token,
        ...nachricht,
      });
    }
  }
}
