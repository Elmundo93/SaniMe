import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingModule } from './common/logging/logging.module';
import { configModuleOptions } from './config/configuration';
import { DatabaseModule } from './db/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DocumentModule } from './modules/document/document.module';
import { HealthDataModule } from './modules/health-data/health-data.module';
import { HealthModule } from './modules/health/health.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { JobQueueModule } from './modules/job-queue/job-queue.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SupplyOrderModule } from './modules/supply-order/supply-order.module';
import { TestFixturesModule } from './testing/test-fixtures.module';

// TestFixturesModule (throwaway audit/idempotency proof endpoints) never
// ships in production routing — see src/testing/test-fixtures.module.ts.
const devOnlyModules = process.env.NODE_ENV !== 'production' ? [TestFixturesModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    LoggingModule,
    DatabaseModule,
    AuditModule,
    IdempotencyModule,
    JobQueueModule,
    NotificationModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    CatalogModule,
    DocumentModule,
    CustomerModule,
    HealthDataModule,
    SupplyOrderModule,
    OnboardingModule,
    AppointmentModule,
    AdminModule,
    ...devOnlyModules,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer.apply(IdempotencyMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
