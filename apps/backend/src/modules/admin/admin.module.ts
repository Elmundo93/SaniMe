import { Module } from '@nestjs/common';
import { AppointmentModule } from '../appointment/appointment.module';
import { AuthModule } from '../auth/auth.module';
import { SupplyOrderModule } from '../supply-order/supply-order.module';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './admin.service';
import { OrderNotesRepository } from './order-notes.repository';

@Module({
  imports: [AuthModule, SupplyOrderModule, AppointmentModule],
  controllers: [AdminController],
  providers: [OrderNotesRepository, AdminService],
})
export class AdminModule {}
