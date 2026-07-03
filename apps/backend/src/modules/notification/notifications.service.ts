import { Inject, Injectable } from '@nestjs/common';
import { JOB_QUEUE, type JobQueue } from '../job-queue/ports/job-queue.port';
import { NotificationsRepository } from './notifications.repository';
import type { NotificationChannel } from './ports/notification-provider.port';

export interface NotifyInput {
  organizationId: string;
  recipientType: 'customer' | 'admin';
  recipientId: string | null;
  channel: NotificationChannel;
  target: string;
  title: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
  ) {}

  async notify(input: NotifyInput) {
    const row = await this.repository.create(input);
    await this.jobQueue.enqueue('notification.send', { notificationId: row.id });
    return row;
  }
}
