import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PushTokensController } from './controllers/push-tokens.controller';
import { NotificationSendJobHandler } from './jobs/notification-send.job-handler';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_PROVIDER } from './ports/notification-provider.port';
import { ApnsNotificationProvider, apnsKonfigurationAusEnv } from './providers/apns-notification.provider';
import { LoggingNotificationProvider } from './providers/logging-notification.provider';
import { PushTokensRepository } from './push-tokens.repository';

@Module({
  imports: [AuthModule],
  controllers: [PushTokensController],
  providers: [
    NotificationsRepository,
    PushTokensRepository,
    NotificationsService,
    NotificationSendJobHandler,
    LoggingNotificationProvider,
    {
      provide: NOTIFICATION_PROVIDER,
      inject: [ConfigService, LoggingNotificationProvider],
      useFactory: (config: ConfigService, logging: LoggingNotificationProvider) => {
        const apns = apnsKonfigurationAusEnv((name) => config.get<string>(name));
        return apns ? new ApnsNotificationProvider(apns, logging) : logging;
      },
    },
  ],
  exports: [NotificationsService, PushTokensRepository],
})
export class NotificationModule {}
