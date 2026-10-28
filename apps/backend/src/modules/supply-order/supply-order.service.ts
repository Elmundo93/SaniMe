import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ERREICHBARKEITEN,
  erstelleLeereSupply,
  NOTFALL_GRUENDE,
  SupplyWorkflow,
  type NotfallAnfrage,
  type SupplyContext,
  type SupplyEvent,
  type SupplyStatus,
} from '@sanime/domain';
import type { TenantContext } from '../../common/repository/tenant-context';
import { AuditService } from '../audit/audit.service';
import { recordSupplyTransition } from '../../common/metrics/metrics';
import { withSpan } from '../../common/tracing/tracer';
import { NotificationsService } from '../notification/notifications.service';
import { KUNDEN_NACHRICHTEN, OPEN_ACTIONS_META, SCHRITT_AKTION } from './event-consumers/open-actions.consumer';
import { TIMELINE_META } from './event-consumers/timeline.consumer';
import { OpenActionsRepository } from './open-actions.repository';
import { OrderStatusEventsRepository } from './order-status-events.repository';
import { OrdersRepository } from './orders.repository';
import { SuppliesRepository } from './supplies.repository';
import { TimelineEventsRepository } from './timeline-events.repository';
import { UrgentDeliveryRequestsRepository } from './urgent-delivery-requests.repository';

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
  // Selbstzahler-Produkte (keine Hilfsmittelnummer) haben nichts zu snapshotten.
  hilfsmittelNrSnapshot: string | null;
  doctorNameSnapshot?: string;
  insurerNameSnapshot?: string;
  customerCopaySnapshotCents: number;
  deliveryTimeLabelSnapshot: string;
  deliveryAddressId: string | null;
  // Selbstzahler-Versorgung: nach dem Eingang gleich freigegeben, ohne Antrag.
  ohneGenehmigung?: boolean;
}

// Solange noch nicht geliefert/entschieden-abgelehnt ist, kann es dringend werden.
const NOTFALL_MOEGLICH: SupplyStatus[] = ['submitted', 'insurance_review', 'approved', 'supplier_assigned', 'ordered'];

// Termine wählt der Kunde nach der Genehmigung (bzw. bei Selbstzahlern sofort),
// solange noch nicht geliefert wurde.
export const TERMIN_WAEHLBAR: SupplyStatus[] = ['approved', 'supplier_assigned', 'ordered'];

function groupBySupplyId<T extends { supplyId: string }>(rows: T[]): Map<string, T[]> {
  const bySupplyId = new Map<string, T[]>();
  for (const row of rows) {
    const list = bySupplyId.get(row.supplyId) ?? [];
    list.push(row);
    bySupplyId.set(row.supplyId, list);
  }
  return bySupplyId;
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
    private readonly urgentRequests: UrgentDeliveryRequestsRepository,
    private readonly notifications: NotificationsService,
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
      doctorNameSnapshot: input.doctorNameSnapshot ?? '',
      insurerNameSnapshot: input.insurerNameSnapshot ?? '',
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
    if (input.ohneGenehmigung) {
      context = await this.applyTransition(tenant, context, orderRow.id, { type: 'OhneGenehmigungFreigegeben' }, actor);
    }

    return { supplyId: supplyRow.id, orderId: orderRow.id, status: context.status };
  }

  async transitionOrder(
    tenant: TenantContext,
    orderId: string,
    event: SupplyEvent,
    actor: SupplyActor,
    metadata: Record<string, unknown> = {},
  ) {
    const order = await this.orders.findById(tenant, orderId);
    if (!order) {
      throw new NotFoundException('Bestellung nicht gefunden');
    }
    const supply = await this.supplies.findById(tenant, order.supplyId);
    if (!supply) {
      throw new NotFoundException('Versorgung nicht gefunden');
    }
    const context: SupplyContext = { id: supply.id, status: supply.status as SupplyStatus };
    const nextContext = await this.applyTransition(tenant, context, order.id, event, actor, metadata);
    return { supplyId: supply.id, orderId: order.id, status: nextContext.status };
  }

  // actorCustomerId: null means unrestricted (admin); a customerId restricts
  // the read to that customer's own resources — see resolveOwnerFilter's
  // doc comment for why an unclaimed customer session must never resolve to
  // null here.
  // Attaches each supply's timeline + unresolved open actions in two batched
  // queries — the mobile dashboard's list view renders full detail cards
  // directly from this response (no per-item detail round-trip), and at
  // pilot scale (a handful of active supplies per customer) this is cheap.
  async listSupplies(tenant: TenantContext, actorCustomerId: string | null = null) {
    const rows =
      actorCustomerId !== null
        ? await this.supplies.listForCustomer(tenant, actorCustomerId)
        : await this.supplies.listAll(tenant);
    const supplyIds = rows.map((r) => r.id);
    // Kunden sehen nur ihre eigenen Aufgaben, nie die unseres Teams.
    const audience = actorCustomerId !== null ? 'kunde' : undefined;
    const [actions, timeline, zusatz] = await Promise.all([
      this.openActions.listUnresolvedForSupplies(supplyIds, audience),
      this.timelineEvents.listForSupplies(supplyIds),
      this.prozessDaten(supplyIds),
    ]);
    const actionsBySupplyId = groupBySupplyId(actions);
    const timelineBySupplyId = groupBySupplyId(timeline);
    return rows.map((row) => ({
      ...row,
      openActions: actionsBySupplyId.get(row.id) ?? [],
      timeline: timelineBySupplyId.get(row.id) ?? [],
      ...zusatz(row.id),
    }));
  }

  // Termin und offene Notfallanfrage je Versorgung — was die App für
  // „Wie geht es weiter?“ braucht, ohne pro Versorgung nachzufragen.
  private async prozessDaten(supplyIds: string[]) {
    const [termine, notfaelle] = await Promise.all([
      this.urgentRequests.listAppointmentsForSupplies(supplyIds),
      this.urgentRequests.listOpenForSupplies(supplyIds),
    ]);
    return (supplyId: string) => {
      const termin = termine.find((t) => t.supplyId === supplyId);
      const notfall = notfaelle.find((n) => n.supplyId === supplyId);
      return {
        appointment: termin ? { start: termin.scheduledStart, end: termin.scheduledEnd } : null,
        urgentRequest: notfall ? { reason: notfall.reason, availability: notfall.availability, createdAt: notfall.createdAt } : null,
      };
    };
  }

  // Notfalllieferung: wird nie automatisch zugesagt — es entsteht eine
  // dringende Rückruf-Aufgabe für unser Team, der Kunde sieht „Wir rufen dich an“.
  async notfallAnfragen(tenant: TenantContext, supplyId: string, anfrage: NotfallAnfrage, actorCustomerId: string | null) {
    const supply = await this.supplies.findById(tenant, supplyId);
    if (!supply) throw new NotFoundException('Versorgung nicht gefunden');
    if (actorCustomerId !== null && supply.customerId !== actorCustomerId) {
      throw new ForbiddenException('Kein Zugriff auf diese Versorgung');
    }
    if (!NOTFALL_MOEGLICH.includes(supply.status as SupplyStatus)) {
      throw new BadRequestException('Für diese Versorgung ist keine Notfalllieferung mehr möglich');
    }
    const [offen] = await this.urgentRequests.listOpenForSupplies([supplyId]);
    if (offen) throw new ConflictException('Deine Anfrage liegt uns schon vor — wir rufen dich an');

    const telefon = anfrage.telefon?.trim() || null;
    const aktion = await this.openActions.create({
      supplyId,
      title: 'Notfalllieferung: Kunden zurückrufen',
      description: [
        NOTFALL_GRUENDE[anfrage.grund],
        `Erreichbar: ${ERREICHBARKEITEN[anfrage.erreichbarkeit]}`,
        telefon ? `Rückrufnummer: ${telefon}` : 'Rückrufnummer: wie im Kundenkonto',
      ].join(' · '),
      actionType: 'rueckruf',
      audience: 'intern',
    });
    const row = await this.urgentRequests.create({
      supplyId,
      reason: anfrage.grund,
      availability: anfrage.erreichbarkeit,
      phone: telefon,
      openActionId: aktion.id,
    });
    await this.timelineEvents.create({
      supplyId,
      label: 'Notfalllieferung angefragt',
      description: 'Wir rufen dich an, um zu klären, wie wir dich schneller versorgen können.',
      completed: true,
      occurredAt: new Date(),
    });
    await this.auditService.record({
      tenant,
      actorType: actorCustomerId ? 'customer' : 'admin',
      actorId: actorCustomerId,
      eventType: 'UrgentDeliveryRequested',
      resourceType: 'supply',
      resourceId: supplyId,
    });
    return row;
  }

  // Der Kunde hat seinen Liefertermin gebucht (AppointmentsService).
  async terminGewaehlt(supplyId: string, start: Date) {
    await this.openActions.resolveByType(supplyId, 'termin');
    await this.timelineEvents.create({
      supplyId,
      label: 'Liefertermin vereinbart',
      description: `Wir kommen am ${start.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'Europe/Berlin' })}.`,
      completed: true,
      occurredAt: new Date(),
    });
  }

  listSuppliesForCustomer(tenant: TenantContext, customerId: string) {
    return this.supplies.listForCustomer(tenant, customerId);
  }

  async getSupply(tenant: TenantContext, id: string, actorCustomerId: string | null = null) {
    const supply = await this.supplies.findById(tenant, id);
    if (!supply) {
      throw new NotFoundException('Versorgung nicht gefunden');
    }
    if (actorCustomerId !== null && supply.customerId !== actorCustomerId) {
      throw new ForbiddenException('Kein Zugriff auf diese Versorgung');
    }
    const timeline = await this.timelineEvents.listForSupply(id);
    const actions = await this.openActions.listForSupply(id, actorCustomerId !== null ? 'kunde' : undefined);
    const zusatz = await this.prozessDaten([id]);
    return { ...supply, timeline, openActions: actions, ...zusatz(id) };
  }

  async getOrder(tenant: TenantContext, id: string, actorCustomerId: string | null = null) {
    const order = await this.orders.findById(tenant, id);
    if (!order) {
      throw new NotFoundException('Bestellung nicht gefunden');
    }
    if (actorCustomerId !== null) {
      const supply = await this.supplies.findById(tenant, order.supplyId);
      if (!supply || supply.customerId !== actorCustomerId) {
        throw new ForbiddenException('Kein Zugriff auf diese Bestellung');
      }
    }
    return order;
  }

  async getOrderForSupply(tenant: TenantContext, supplyId: string) {
    const order = await this.orders.findBySupplyId(tenant, supplyId);
    if (!order) throw new NotFoundException('Bestellung nicht gefunden');
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

  // The single choke point for every supply status change — one span per
  // call, keyed by the triggering event type, plus a matching counter
  // increment for the same reason (Layer 5 Phase 8's instrumentation list).
  private applyTransition(
    tenant: TenantContext,
    context: SupplyContext,
    orderId: string,
    event: SupplyEvent,
    actor: SupplyActor,
    metadata: Record<string, unknown> = {},
  ): Promise<SupplyContext> {
    return withSpan('SupplyOrderService.applyTransition', (span) => {
      span.setAttribute('supply.event', event.type);
      return this.applyTransitionInner(tenant, context, orderId, event, actor, metadata);
    });
  }

  private async applyTransitionInner(
    tenant: TenantContext,
    context: SupplyContext,
    orderId: string,
    event: SupplyEvent,
    actor: SupplyActor,
    metadata: Record<string, unknown>,
  ): Promise<SupplyContext> {
    const result = SupplyWorkflow.transition(context, event);
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }
    recordSupplyTransition(event.type);

    const jetzt = new Date();
    await this.supplies.setStatus(tenant, context.id, result.context.status, {
      ...(event.type === 'AntragVersendet' ? { insuranceSubmittedAt: jetzt } : {}),
      ...(event.type === 'InsuranceApproved' || event.type === 'InsuranceRejected' ? { insuranceDecidedAt: jetzt } : {}),
    });
    await this.orders.setStatus(tenant, orderId, result.context.status);
    // Die Aufgabe des alten Schritts ist mit dem Wechsel erledigt.
    await this.openActions.resolveByType(context.id, SCHRITT_AKTION);

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

      for (const vorlage of OPEN_ACTIONS_META[domainEvent.type] ?? []) {
        await this.openActions.create({ supplyId: context.id, ...vorlage });
      }

      await this.benachrichtigeKunden(tenant, context.id, domainEvent.type);

      await this.auditService.record({
        tenant,
        actorType: actor.type,
        actorId: actor.id,
        eventType: domainEvent.type,
        resourceType: 'supply',
        resourceId: context.id,
        metadata,
      });
    }

    return result.context;
  }

  private async benachrichtigeKunden(tenant: TenantContext, supplyId: string, eventType: SupplyEvent['type']) {
    const nachricht = KUNDEN_NACHRICHTEN[eventType];
    if (!nachricht) return;
    const supply = await this.supplies.findById(tenant, supplyId);
    if (!supply?.customerId) return;
    await this.notifications.notifyCustomer(tenant.organizationId, supply.customerId, { ...nachricht, data: { supplyId } });
  }
}
