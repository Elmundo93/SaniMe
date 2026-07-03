import { Inject, Injectable } from '@nestjs/common';
import type { TenantContext } from '../../common/repository/tenant-context';
import { JOB_QUEUE, type JobQueue } from '../job-queue/ports/job-queue.port';
import type { SupplyActor } from '../supply-order/supply-order.service';
import { SupplyOrderService } from '../supply-order/supply-order.service';
import { AppointmentsRepository } from './appointments.repository';
import { SupplierCalendarService, type ProposedSlot } from './supplier-calendar.service';

const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

export interface BookAppointmentInput {
  orderId: string;
  supplierId: string;
  scheduledStart: string;
  scheduledEnd: string;
  addressId: string | null;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly calendar: SupplierCalendarService,
    private readonly appointments: AppointmentsRepository,
    private readonly supplyOrder: SupplyOrderService,
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
  ) {}

  proposeSlots(tenant: TenantContext, supplierId: string, productId: string, count = 3): Promise<ProposedSlot[]> {
    return this.calendar.proposeSlots(tenant, supplierId, productId, count);
  }

  // Booking and firing the SupplyWorkflow transition are one indivisible
  // action — combined here rather than two separate admin calls that could
  // drift out of sync (a booked appointment with no AppointmentScheduled
  // transition, or vice versa).
  async book(tenant: TenantContext, input: BookAppointmentInput, actor: SupplyActor) {
    const order = await this.supplyOrder.getOrder(tenant, input.orderId);

    const appointment = await this.appointments.create(tenant, {
      supplyId: order.supplyId,
      orderId: order.id,
      supplierId: input.supplierId,
      scheduledStart: new Date(input.scheduledStart),
      scheduledEnd: new Date(input.scheduledEnd),
      addressId: input.addressId,
    });

    await this.supplyOrder.transitionOrder(tenant, order.id, { type: 'AppointmentScheduled' }, actor);

    const delayMs = Math.max(0, new Date(input.scheduledStart).getTime() - REMINDER_LEAD_MS - Date.now());
    await this.jobQueue.enqueue('appointment.reminder', { appointmentId: appointment.id }, { delayMs });

    return appointment;
  }

  findForOrder(tenant: TenantContext, orderId: string) {
    return this.appointments.findForOrder(tenant, orderId);
  }
}
