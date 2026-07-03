import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CustomerModule } from '../customer/customer.module';
import { NotificationModule } from '../notification/notification.module';
import { SupplyOrderModule } from '../supply-order/supply-order.module';
import { AppointmentsController } from './controllers/appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';
import { AppointmentReminderJobHandler } from './jobs/appointment-reminder.job-handler';
import { SupplierCalendarService } from './supplier-calendar.service';

@Module({
  imports: [AuthModule, CatalogModule, CustomerModule, NotificationModule, SupplyOrderModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsRepository, SupplierCalendarService, AppointmentsService, AppointmentReminderJobHandler],
  exports: [AppointmentsService],
})
export class AppointmentModule {}
