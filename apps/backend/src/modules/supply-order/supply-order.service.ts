import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { erstelleLeereSupply, SupplyWorkflow, type SupplyContext, type SupplyEvent, type SupplyStatus } from '@sanime/domain';
import type { TenantContext } from '../../common/repository/tenant-context';
import { AuditService } from '../audit/audit.service';
import { OPEN_ACTIONS_META } from './event-consumers/open-actions.consumer';
import { TIMELINE_META } from './event-consumers/timeline.consumer';
import { OpenActionsRepository } from './open-actions.repository';
import { OrderStatusEventsRepository } from './order-status-events.repository';
import { OrdersRepository } from './orders.repository';
import { SuppliesRepository } from './supplies.repository';
import { TimelineEventsRepository } from './timeline-events.repository';

export interface SupplyActor {
  type: 'customer' | 'admin' | 'system';
  id: string | null;
}

export interface CreateSupplyFromOnboardingInput {
  onboardingSessionId: string;
  customerId: string | null;
  productId: string;
  supplierProductId: string | null;
  ocrResultId: string | null;
  productNameSnapshot: string;
  manufacturerNameSnapshot: string;
  hilfsmittelNrSnapshot: string;
  customerCopaySnapshotCents: number;
  deliveryTimeLabelSnapshot: string;
  deliveryAddressId: string | null;
}

// Replayed on onboarding completion — by ABGESCHLOSSEN all these
// preconditions already hold, so this replays them as discrete transitions
// (5 real order_status_events rows) rather than one direct jump to
// 'submitted'. "events, not one big function" holds even inside one request.
const ONBOARDING_COMPLETION_REPLAY: SupplyEvent[] = [
  { type: 'SupplyCreated' },
  { type: 'DocumentsUploaded' },
  { type: 'OcrVerified' },
  { type: 'CustomerConfirmationReceived' },
  { type: 'Submitted' },
];

@Injectable()
export class SupplyOrderService {
  constructor(
    private readonly supplies: SuppliesRepository,
    private readonly orders: OrdersRepository,
    private readonly orderStatusEvents: OrderStatusEventsRepository,
    private readonly timelineEvents: TimelineEventsRepository,
    private readonly openActions: OpenActionsRepository,
    private readonly auditService: AuditService,
  ) {}

  async createFromOnboarding(tenant: TenantContext, input: CreateSupplyFromOnboardingInput, actor: SupplyActor) {
    const supplyRow = await this.supplies.create(tenant, {
      onboardingSessionId: input.onboardingSessionId,
      customerId: input.customerId,
      productId: input.productId,
      supplierProductId: input.supplierProductId,
      ocrResultId: input.ocrResultId,
      productNameSnapshot: input.productNameSnapshot,
      manufacturerNameSnapshot: input.manufacturerNameSnapshot,
      hilfsmittelNrSnapshot: input.hilfsmittelNrSnapshot,
      customerCopaySnapshotCents: input.customerCopaySnapshotCents,
      deliveryTimeLabelSnapshot: input.deliveryTimeLabelSnapshot,
      status: 'draft',
    });
    const orderRow = await this.orders.create(tenant, {
      supplyId: supplyRow.id,
      status: 'draft',
      deliveryAddressId: input.deliveryAddressId,
    });

    let context: SupplyContext = erstelleLeereSupply(supplyRow.id);
    for (const event of ONBOARDING_COMPLETION_REPLAY) {
      context = await this.applyTransition(tenant, context, orderRow.id, event, actor);
    }

    return { supplyId: supplyRow.id, orderId: orderRow.id, status: context.status };
  }

  async transitionOrder(tenant: TenantContext, orderId: string, event: SupplyEvent, actor: SupplyActor) {
    const order = await this.orders.findById(tenant, orderId);
    if (!order) {
      throw new NotFoundException('Bestellung nicht gefunden');
    }
    const supply = await this.supplies.findById(tenant, order.supplyId);
    if (!supply) {
      throw new NotFoundException('Versorgung nicht gefunden');
    }
    const context: SupplyContext = { id: supply.id, status: supply.status as SupplyStatus };
    const nextContext = await this.applyTransition(tenant, context, order.id, event, actor);
    return { supplyId: supply.id, orderId: order.id, status: nextContext.status };
  }

  listSupplies(tenant: TenantContext) {
    return this.supplies.listAll(tenant);
  }

  listSuppliesForCustomer(tenant: TenantContext, customerId: string) {
    return this.supplies.listForCustomer(tenant, customerId);
  }

  async getSupply(tenant: TenantContext, id: string) {
    const supply = await this.supplies.findById(tenant, id);
    if (!supply) {
      throw new NotFoundException('Versorgung nicht gefunden');
    }
    const timeline = await this.timelineEvents.listForSupply(id);
    const actions = await this.openActions.listForSupply(id);
    return { ...supply, timeline, openActions: actions };
  }

  async getOrder(tenant: TenantContext, id: string) {
    const order = await this.orders.findById(tenant, id);
    if (!order) {
      throw new NotFoundException('Bestellung nicht gefunden');
    }
    return order;
  }

  async createOpenAction(supplyId: string, title: string, description: string, actionType: string) {
    return this.openActions.create({ supplyId, title, description, actionType });
  }

  async resolveOpenAction(id: string) {
    await this.openActions.resolve(id);
  }

  // Admin's inbox — Admin never imports Supply/Order's repositories
  // directly, matching the "modules export only their Service" discipline.
  listInbox(tenant: TenantContext) {
    return this.openActions.listOpenForInbox(tenant);
  }

  listOrders(tenant: TenantContext) {
    return this.orders.listAllWithSupply(tenant);
  }

  async createAdminTimelineEntry(supplyId: string, label: string, description: string) {
    return this.timelineEvents.createAdminEntry({ supplyId, label, description });
  }

  private async applyTransition(
    tenant: TenantContext,
    context: SupplyContext,
    orderId: string,
    event: SupplyEvent,
    actor: SupplyActor,
  ): Promise<SupplyContext> {
    const result = SupplyWorkflow.transition(context, event);
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }

    await this.supplies.setStatus(tenant, context.id, result.context.status);
    await this.orders.setStatus(tenant, orderId, result.context.status);

    for (const domainEvent of result.events) {
      await this.orderStatusEvents.record({
        orderId,
        fromStatus: context.status,
        toStatus: result.context.status,
        eventType: domainEvent.type,
        actorType: actor.type,
        actorId: actor.id,
      });

      const timelineMeta = TIMELINE_META[domainEvent.type];
      await this.timelineEvents.create({
        supplyId: context.id,
        label: timelineMeta.label,
        description: timelineMeta.description,
        completed: true,
        occurredAt: new Date(),
      });

      const openActionMeta = OPEN_ACTIONS_META[domainEvent.type];
      if (openActionMeta) {
        await this.openActions.create({ supplyId: context.id, ...openActionMeta });
      }

      await this.auditService.record({
        tenant,
        actorType: actor.type,
        actorId: actor.id,
        eventType: domainEvent.type,
        resourceType: 'supply',
        resourceId: context.id,
      });
    }

    return result.context;
  }
}
