import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { CustomersService } from '../../customer/customers.service';
import { JOB_QUEUE, type JobHandler, type JobQueue } from '../../job-queue/ports/job-queue.port';
import { NotificationsService } from '../../notification/notifications.service';
import { SupplyOrderService } from '../../supply-order/supply-order.service';
import { AppointmentsRepository } from '../appointments.repository';

interface AppointmentReminderPayload {
  appointmentId: string;
}

// Gives JobQueue's third real caller (per the Layer 3 plan) a concrete
// target: a customer email reminder ahead of a confirmed appointment.
// Silently skips (logs, doesn't throw) when there's no customer or no email
// on file — same "log, don't crash for an unreachable target" discipline as
// InProcessJobQueue's own unregistered-handler path.
@Injectable()
export class AppointmentReminderJobHandler implements JobHandler<AppointmentReminderPayload>, OnModuleInit {
  readonly jobName = 'appointment.reminder';
  private readonly logger = new Logger(AppointmentReminderJobHandler.name);

  constructor(
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
    private readonly appointments: AppointmentsRepository,
    private readonly supplyOrder: SupplyOrderService,
    private readonly customers: CustomersService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.jobQueue.registerHandler(this);
  }

  async handle({ appointmentId }: AppointmentReminderPayload): Promise<void> {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) {
      this.logger.warn(`Termin "${appointmentId}" für Erinnerung nicht gefunden`);
      return;
    }

    const supply = await this.supplyOrder.getSupply(DEFAULT_TENANT_CONTEXT, appointment.supplyId);
    if (!supply.customerId) {
      this.logger.log(`Kein Kunde für Termin "${appointmentId}" hinterlegt — Erinnerung übersprungen`);
      return;
    }

    const customer = await this.customers.findById(DEFAULT_TENANT_CONTEXT, supply.customerId);
    if (!customer?.email) {
      this.logger.log(`Keine E-Mail-Adresse für Kunde "${supply.customerId}" — Erinnerung übersprungen`);
      return;
    }

    await this.notifications.notify({
      organizationId: DEFAULT_TENANT_CONTEXT.organizationId,
      recipientType: 'customer',
      recipientId: customer.id,
      channel: 'email',
      target: customer.email,
      title: 'Terminerinnerung',
      body: `Dein Termin am ${appointment.scheduledStart.toISOString()} steht bevor.`,
    });
  }
}
