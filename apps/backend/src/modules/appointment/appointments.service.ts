import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import type { SupplyStatus } from '@sanime/domain';
import { CatalogService } from '../catalog/catalog.service';
import type { TenantContext } from '../../common/repository/tenant-context';
import { JOB_QUEUE, type JobQueue } from '../job-queue/ports/job-queue.port';
import type { SupplyActor } from '../supply-order/supply-order.service';
import { SupplyOrderService, TERMIN_WAEHLBAR } from '../supply-order/supply-order.service';
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
    private readonly catalog: CatalogService,
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

    await this.supplyOrder.transitionOrder(tenant, order.id, { type: 'AppointmentScheduled' }, actor, {
      appointmentId: appointment.id,
      supplierId: input.supplierId,
    });

    const delayMs = Math.max(0, new Date(input.scheduledStart).getTime() - REMINDER_LEAD_MS - Date.now());
    await this.jobQueue.enqueue('appointment.reminder', { appointmentId: appointment.id }, { delayMs });

    return appointment;
  }

  // Vom Kunden gewählter Liefertermin (nach der Genehmigung bzw. an der Kasse
  // einer Selbstzahler-Bestellung). Bewusst *ohne* AppointmentScheduled: der
  // Termin steht, aber bestellt/zugewiesen wird intern unabhängig davon — das
  // Statusmodell erlaubt AppointmentScheduled erst nach 'ordered'.
  async bookForCustomer(tenant: TenantContext, input: BookAppointmentInput) {
    const order = await this.supplyOrder.getOrder(tenant, input.orderId);
    const appointment = await this.appointments.create(tenant, {
      supplyId: order.supplyId,
      orderId: order.id,
      supplierId: input.supplierId,
      scheduledStart: new Date(input.scheduledStart),
      scheduledEnd: new Date(input.scheduledEnd),
      addressId: input.addressId,
    });
    await this.supplyOrder.terminGewaehlt(order.supplyId, appointment.scheduledStart);
    const delayMs = Math.max(0, new Date(input.scheduledStart).getTime() - REMINDER_LEAD_MS - Date.now());
    await this.jobQueue.enqueue('appointment.reminder', { appointmentId: appointment.id }, { delayMs });
    return appointment;
  }

  // Terminvorschläge für eine genehmigte Versorgung — Lieferant und Produkt
  // kommen aus der Versorgung selbst, nie vom Client.
  async slotsFuerVersorgung(tenant: TenantContext, supplyId: string, customerId: string | null) {
    const { supply, supplierId } = await this.terminFaehig(tenant, supplyId, customerId);
    return this.calendar.proposeSlots(tenant, supplierId, supply.productId, 5);
  }

  // Bucht nur einen Termin, der gerade auch vorgeschlagen würde — sonst
  // könnte der Client beliebige Zeiten (auch an vollen Tagen) setzen.
  async terminWaehlen(tenant: TenantContext, supplyId: string, customerId: string | null, start: string) {
    const { supply, supplierId } = await this.terminFaehig(tenant, supplyId, customerId);
    const slots = await this.calendar.proposeSlots(tenant, supplierId, supply.productId, 5);
    const slot = slots.find((s) => new Date(s.start).getTime() === new Date(start).getTime());
    if (!slot) throw new BadRequestException('Dieser Termin ist nicht mehr frei — bitte wähle einen anderen.');
    const order = await this.supplyOrder.getOrderForSupply(tenant, supplyId);
    return this.bookForCustomer(tenant, {
      orderId: order.id,
      supplierId,
      scheduledStart: slot.start,
      scheduledEnd: slot.end,
      addressId: order.deliveryAddressId,
    });
  }

  private async terminFaehig(tenant: TenantContext, supplyId: string, customerId: string | null) {
    const supply = await this.supplyOrder.getSupply(tenant, supplyId, customerId);
    if (!TERMIN_WAEHLBAR.includes(supply.status as SupplyStatus)) {
      throw new BadRequestException('Den Liefertermin kannst du wählen, sobald deine Versorgung genehmigt ist.');
    }
    if (supply.appointment) throw new ConflictException('Für diese Versorgung steht bereits ein Termin fest.');
    const supplierId = (await this.catalog.getProduct(tenant, supply.productId)).offers[0]?.supplierId;
    if (!supplierId) throw new BadRequestException('Für dieses Produkt ist aktuell kein Lieferant verfügbar');
    return { supply, supplierId };
  }

  findForOrder(tenant: TenantContext, orderId: string) {
    return this.appointments.findForOrder(tenant, orderId);
  }
}
