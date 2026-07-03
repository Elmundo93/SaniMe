import { Injectable } from '@nestjs/common';
import type { SupplyEvent } from '@sanime/domain';
import type { TenantContext } from '../../common/repository/tenant-context';
import { AppointmentsService } from '../appointment/appointments.service';
import { AuditService } from '../audit/audit.service';
import type { SupplyActor } from '../supply-order/supply-order.service';
import { SupplyOrderService } from '../supply-order/supply-order.service';
import { OrderNotesRepository } from './order-notes.repository';

@Injectable()
export class AdminService {
  constructor(
    private readonly supplyOrder: SupplyOrderService,
    private readonly orderNotes: OrderNotesRepository,
    private readonly appointments: AppointmentsService,
    private readonly auditService: AuditService,
  ) {}

  listInbox(tenant: TenantContext) {
    return this.supplyOrder.listInbox(tenant);
  }

  listOrders(tenant: TenantContext) {
    return this.supplyOrder.listOrders(tenant);
  }

  // Pure composition, no duplicated logic: getOrder/getSupply already exist
  // (the latter already returns timeline+openActions), notes and the
  // appointment are simply attached alongside.
  async getOrderDetail(tenant: TenantContext, orderId: string) {
    const order = await this.supplyOrder.getOrder(tenant, orderId);
    const supply = await this.supplyOrder.getSupply(tenant, order.supplyId);
    const notes = await this.orderNotes.listForOrder(orderId);
    const appointment = await this.appointments.findForOrder(tenant, orderId);
    return { order, supply, notes, appointment };
  }

  async addNote(tenant: TenantContext, orderId: string, authorAdminId: string, body: string) {
    await this.supplyOrder.getOrder(tenant, orderId); // 404s if the order doesn't exist
    const note = await this.orderNotes.create({ orderId, authorAdminId, body });
    await this.auditService.record({
      tenant,
      actorType: 'admin',
      actorId: authorAdminId,
      eventType: 'OrderNoteAdded',
      resourceType: 'order',
      resourceId: orderId,
    });
    return note;
  }

  async addTimelineEntry(tenant: TenantContext, orderId: string, label: string, description: string) {
    const order = await this.supplyOrder.getOrder(tenant, orderId);
    return this.supplyOrder.createAdminTimelineEntry(order.supplyId, label, description);
  }

  // Genuinely additive: a second thin adapter onto the same
  // SupplyOrderService.transitionOrder as the existing PATCH
  // /orders/:id/status — same event schema, same guard, zero duplicated logic.
  transitionStatus(tenant: TenantContext, orderId: string, event: SupplyEvent, actor: SupplyActor) {
    return this.supplyOrder.transitionOrder(tenant, orderId, event, actor);
  }
}
