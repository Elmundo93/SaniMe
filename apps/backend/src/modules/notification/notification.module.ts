import { Module } from '@nestjs/common';
import { NotificationSendJobHandler } from './jobs/notification-send.job-handler';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_PROVIDER } from './ports/notification-provider.port';
import { LoggingNotificationProvider } from './providers/logging-notification.provider';

@Module({
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationSendJobHandler,
    { provide: NOTIFICATION_PROVIDER, useClass: LoggingNotificationProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationModule {}
