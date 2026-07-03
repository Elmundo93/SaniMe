import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { InProcessJobQueue } from '../job-queue/providers/in-process-job-queue.provider';
import { NotificationSendJobHandler } from './jobs/notification-send.job-handler';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { LoggingNotificationProvider } from './providers/logging-notification.provider';

// Runs against the real docker-compose Postgres — wires NotificationsService
// -> InProcessJobQueue -> NotificationSendJobHandler -> LoggingNotificationProvider
// end to end, the same way the real app.module.ts graph does.
describe('Notification flow (integration)', () => {
  let pool: Pool;
  let repository: NotificationsRepository;
  let jobQueue: InProcessJobQueue;
  let service: NotificationsService;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    repository = new NotificationsRepository(db);
    jobQueue = new InProcessJobQueue();
    service = new NotificationsService(repository, jobQueue);

    const configService = new ConfigService({ NODE_ENV: 'test' });
    const handler = new NotificationSendJobHandler(jobQueue, new LoggingNotificationProvider(configService), repository);
    handler.onModuleInit();
  });

  afterAll(async () => {
    jobQueue.onModuleDestroy();
    await pool.end();
  });

  function waitForJob(ms = 200) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  it('creates a pending notification, then marks it sent once the queued job runs', async () => {
    const created = await service.notify({
      organizationId: '00000000-0000-0000-0000-000000000001',
      recipientType: 'customer',
      recipientId: null,
      channel: 'push',
      target: 'expo-push-token-123',
      title: 'Termin bestätigt',
      body: 'Dein Termin wurde bestätigt.',
    });
    expect(created.status).toBe('pending');

    await waitForJob();

    const afterJob = await repository.findById(created.id);
    expect(afterJob?.status).toBe('sent');
    expect(afterJob?.sentAt).not.toBeNull();
  });
});
