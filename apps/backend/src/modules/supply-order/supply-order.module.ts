import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersController } from './controllers/orders.controller';
import { SuppliesController } from './controllers/supplies.controller';
import { OpenActionsRepository } from './open-actions.repository';
import { OrderStatusEventsRepository } from './order-status-events.repository';
import { OrdersRepository } from './orders.repository';
import { SupplyOrderService } from './supply-order.service';
import { SuppliesRepository } from './supplies.repository';
import { TimelineEventsRepository } from './timeline-events.repository';

@Module({
  imports: [AuthModule],
  controllers: [SuppliesController, OrdersController],
  providers: [
    SuppliesRepository,
    OrdersRepository,
    OrderStatusEventsRepository,
    TimelineEventsRepository,
    OpenActionsRepository,
    SupplyOrderService,
  ],
  exports: [SupplyOrderService],
})
export class SupplyOrderModule {}
