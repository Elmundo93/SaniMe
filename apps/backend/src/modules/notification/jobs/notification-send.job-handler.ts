import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { JOB_QUEUE, type JobHandler, type JobQueue } from '../../job-queue/ports/job-queue.port';
import { NotificationsRepository } from '../notifications.repository';
import { NOTIFICATION_PROVIDER, type NotificationChannel, type NotificationProvider } from '../ports/notification-provider.port';

interface NotificationSendPayload {
  notificationId: string;
}

@Injectable()
export class NotificationSendJobHandler implements JobHandler<NotificationSendPayload>, OnModuleInit {
  readonly jobName = 'notification.send';

  constructor(
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
    @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider,
    private readonly repository: NotificationsRepository,
  ) {}

  onModuleInit() {
    this.jobQueue.registerHandler(this);
  }

  async handle(payload: NotificationSendPayload): Promise<void> {
    const notification = await this.repository.findById(payload.notificationId);
    if (!notification) {
      return;
    }
    try {
      await this.provider.send({
        channel: notification.channel as NotificationChannel,
        target: notification.target,
        title: notification.title,
        body: notification.body,
      });
      await this.repository.markSent(notification.id);
    } catch (error) {
      await this.repository.markFailed(notification.id, error instanceof Error ? error.message : 'unbekannter Fehler');
      throw error; // rethrow so JobQueue's own retry/backoff logic applies
    }
  }
}
