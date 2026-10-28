import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { OrdersController } from './controllers/orders.controller';
import { SuppliesController } from './controllers/supplies.controller';
import { OpenActionsRepository } from './open-actions.repository';
import { OrderStatusEventsRepository } from './order-status-events.repository';
import { OrdersRepository } from './orders.repository';
import { SupplyOrderService } from './supply-order.service';
import { SuppliesRepository } from './supplies.repository';
import { TimelineEventsRepository } from './timeline-events.repository';
import { UrgentDeliveryRequestsRepository } from './urgent-delivery-requests.repository';

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [SuppliesController, OrdersController],
  providers: [
    SuppliesRepository,
    OrdersRepository,
    OrderStatusEventsRepository,
    TimelineEventsRepository,
    OpenActionsRepository,
    UrgentDeliveryRequestsRepository,
    SupplyOrderService,
  ],
  exports: [SupplyOrderService],
})
export class SupplyOrderModule {}
