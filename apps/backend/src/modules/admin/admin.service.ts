import { Injectable } from '@nestjs/common';
import { erwarteteAntwortBis, type NotfallErgebnis, type SupplyEvent, type SupplyStatus } from '@sanime/domain';
import type { TenantContext } from '../../common/repository/tenant-context';
import { AppointmentsService } from '../appointment/appointments.service';
import { AuditService } from '../audit/audit.service';
import { AdminUsersRepository } from '../auth/admin-users.repository';
import type { SupplyActor } from '../supply-order/supply-order.service';
import { SupplyOrderService } from '../supply-order/supply-order.service';
import { AdminReadRepository, type VersorgungsFilter } from './admin-read.repository';
import { OrderNotesRepository } from './order-notes.repository';

// Reihenfolge im Arbeitskorb: Notfall-Rückrufe zuerst, dann Kassen-Fristen,
// die in ≤ 3 Tagen ablaufen (oder abgelaufen sind), dann neue Bestellungen,
// dann der Rest — innerhalb jeder Stufe die älteste Aufgabe zuerst.
export type Dringlichkeit = 'notfall' | 'frist' | 'neu' | 'normal';
const RANG: Record<Dringlichkeit, number> = { notfall: 0, frist: 1, neu: 2, normal: 3 };
const FRIST_WARNUNG_MS = 3 * 24 * 60 * 60 * 1000;

export function dringlichkeit(
  aufgabe: { actionType: string; supplyStatus: string; insuranceSubmittedAt: Date | null },
  jetzt = Date.now(),
): Dringlichkeit {
  if (aufgabe.actionType === 'rueckruf') return 'notfall';
  if (aufgabe.supplyStatus === 'insurance_review' && aufgabe.insuranceSubmittedAt) {
    if (erwarteteAntwortBis(aufgabe.insuranceSubmittedAt).getTime() - jetzt <= FRIST_WARNUNG_MS) return 'frist';
  }
  if (aufgabe.supplyStatus === 'submitted') return 'neu';
  return 'normal';
}

@Injectable()
export class AdminService {
  constructor(
    private readonly supplyOrder: SupplyOrderService,
    private readonly orderNotes: OrderNotesRepository,
    private readonly appointments: AppointmentsService,
    private readonly auditService: AuditService,
    private readonly read: AdminReadRepository,
    private readonly adminUsers: AdminUsersRepository,
  ) {}

  async listInbox(tenant: TenantContext) {
    const zeilen = await this.read.listInbox(tenant);
    const jetzt = Date.now();
    return zeilen
      .map((zeile) => ({
        ...zeile,
        dringlichkeit: dringlichkeit(zeile, jetzt),
        fristBis:
          zeile.supplyStatus === 'insurance_review' && zeile.insuranceSubmittedAt
            ? erwarteteAntwortBis(zeile.insuranceSubmittedAt).toISOString()
            : null,
      }))
      .sort((a, b) => RANG[a.dringlichkeit] - RANG[b.dringlichkeit] || a.createdAt.getTime() - b.createdAt.getTime());
  }

  listOrders(tenant: TenantContext, filter: VersorgungsFilter) {
    return this.read.listVersorgungen(tenant, filter);
  }

  listTeam(tenant: TenantContext) {
    return this.adminUsers.listActive(tenant);
  }

  // Alles, was die Detailansicht braucht, in einer Antwort. Bestehende
  // Felder (order, supply inkl. timeline/openActions, notes, appointment)
  // bleiben unverändert; der Rest kommt aus dem Lesemodell dazu.
  async getOrderDetail(tenant: TenantContext, orderId: string) {
    const order = await this.supplyOrder.getOrder(tenant, orderId);
    const supply = await this.supplyOrder.getSupply(tenant, order.supplyId);
    const [notes, appointment, kunde, lieferadresse, rezept, lieferant, aufgaben, notfall] = await Promise.all([
      this.read.notizen(orderId),
      this.appointments.findForOrder(tenant, orderId),
      this.read.kunde(supply.customerId),
      this.read.adresse(order.deliveryAddressId),
      this.read.rezept(supply.ocrResultId),
      this.read.lieferant(supply.supplierProductId),
      this.read.aufgaben(supply.id),
      this.read.offenerNotfall(supply.id),
    ]);
    return {
      order,
      supply,
      notes,
      appointment,
      kunde,
      lieferadresse,
      rezept,
      lieferant,
      aufgaben,
      notfall,
      fristBis:
        supply.status === 'insurance_review' && supply.insuranceSubmittedAt
          ? erwarteteAntwortBis(supply.insuranceSubmittedAt).toISOString()
          : null,
    };
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
  transitionStatus(tenant: TenantContext, orderId: string, event: SupplyEvent, actor: SupplyActor, erwarteterStatus?: SupplyStatus) {
    return this.supplyOrder.transitionOrder(tenant, orderId, event, actor, {}, erwarteterStatus);
  }

  aufgabeZuweisen(tenant: TenantContext, actionId: string, adminId: string | null) {
    return this.supplyOrder.aufgabeZuweisen(tenant, actionId, adminId);
  }

  aufgabeErledigen(tenant: TenantContext, actionId: string, actor: SupplyActor) {
    return this.supplyOrder.aufgabeErledigen(tenant, actionId, actor);
  }

  notfallRueckruf(tenant: TenantContext, requestId: string, ergebnis: NotfallErgebnis, actor: SupplyActor) {
    return this.supplyOrder.notfallRueckruf(tenant, requestId, ergebnis, actor);
  }
}
