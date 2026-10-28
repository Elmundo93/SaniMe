import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import {
  adminUsers,
  customerAddresses,
  customerProfiles,
  customers,
  ocrResults,
  openActions,
  orderNotes,
  orders,
  supplierProducts,
  suppliers,
  supplies,
  urgentDeliveryRequests,
} from '../../db/schema';
import type { TenantContext } from '../../common/repository/tenant-context';

export interface VersorgungsFilter {
  q?: string;
  status?: string[];
  limit: number;
  offset: number;
}

// Lesemodell der Admin-App: eine Abfrage pro Ansicht statt vieler
// Einzelaufrufe über die Fach-Services. Nur lesend — jede Änderung läuft
// weiter über SupplyOrderService (Statuswechsel, Aufgaben, Notfälle).
// Listen enthalten bewusst keine Rezept-/Diagnosedaten (Datensparsamkeit);
// die stehen nur in detail(), dessen Abruf im access_log landet.
// Listen zeigen die gewählte Größe direkt am Produkt („Kniebandage · Größe M“).
const produktMitVariante = sql<string>`${supplies.productNameSnapshot} || coalesce(' · ' || ${supplies.variantLabelSnapshot}, '')`;

@Injectable()
export class AdminReadRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private kundeName() {
    return sql<string | null>`case when ${customers.id} is null then null else trim(${customers.firstName} || ' ' || ${customers.lastName}) end`;
  }

  listInbox(tenant: TenantContext) {
    return this.db
      .select({
        id: openActions.id,
        supplyId: openActions.supplyId,
        orderId: orders.id,
        title: openActions.title,
        description: openActions.description,
        actionType: openActions.actionType,
        createdAt: openActions.createdAt,
        assignedAdminId: openActions.assignedAdminId,
        assignedAdminName: sql<string | null>`nullif(${adminUsers.name}, '')`,
        assignedAdminEmail: adminUsers.email,
        supplyStatus: supplies.status,
        kundeName: this.kundeName(),
        produktName: produktMitVariante,
        kasse: supplies.insurerNameSnapshot,
        insuranceSubmittedAt: supplies.insuranceSubmittedAt,
      })
      .from(openActions)
      .innerJoin(supplies, eq(openActions.supplyId, supplies.id))
      .innerJoin(orders, eq(orders.supplyId, supplies.id))
      .leftJoin(customers, eq(supplies.customerId, customers.id))
      .leftJoin(adminUsers, eq(openActions.assignedAdminId, adminUsers.id))
      .where(
        and(eq(supplies.organizationId, tenant.organizationId), isNull(openActions.resolvedAt), eq(openActions.audience, 'intern')),
      )
      .orderBy(asc(openActions.createdAt));
  }

  async listVersorgungen(tenant: TenantContext, filter: VersorgungsFilter) {
    const bedingungen: (SQL | undefined)[] = [eq(orders.organizationId, tenant.organizationId)];
    if (filter.status && filter.status.length > 0) {
      bedingungen.push(inArray(supplies.status, filter.status));
    }
    const q = filter.q?.trim();
    if (q) {
      const muster = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      bedingungen.push(
        or(
          ilike(sql`${customers.firstName} || ' ' || ${customers.lastName}`, muster),
          ilike(sql`${customers.lastName} || ' ' || ${customers.firstName}`, muster),
          ilike(customers.insuredNumber, muster),
          ilike(supplies.productNameSnapshot, muster),
          ilike(supplies.insurerNameSnapshot, muster),
          ilike(sql`${orders.id}::text`, `${q.replace(/[%_\\]/g, '\\$&')}%`),
        ),
      );
    }
    const where = and(...bedingungen);
    const [eintraege, [{ gesamt }]] = await Promise.all([
      this.db
        .select({
          orderId: orders.id,
          supplyId: supplies.id,
          status: supplies.status,
          createdAt: orders.createdAt,
          updatedAt: supplies.updatedAt,
          kundeName: this.kundeName(),
          produktName: produktMitVariante,
          kasse: supplies.insurerNameSnapshot,
          selbstzahler: sql<boolean>`${supplies.hilfsmittelNrSnapshot} is null`,
          insuranceSubmittedAt: supplies.insuranceSubmittedAt,
        })
        .from(orders)
        .innerJoin(supplies, eq(orders.supplyId, supplies.id))
        .leftJoin(customers, eq(supplies.customerId, customers.id))
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db
        .select({ gesamt: count() })
        .from(orders)
        .innerJoin(supplies, eq(orders.supplyId, supplies.id))
        .leftJoin(customers, eq(supplies.customerId, customers.id))
        .where(where),
    ]);
    return { eintraege, gesamt: Number(gesamt) };
  }

  async kunde(customerId: string | null) {
    if (!customerId) return null;
    const [row] = await this.db
      .select({
        id: customers.id,
        vorname: customers.firstName,
        nachname: customers.lastName,
        telefon: customers.phone,
        email: customers.email,
        versichertennummer: customers.insuredNumber,
        geburtsdatum: customerProfiles.dateOfBirth,
      })
      .from(customers)
      .leftJoin(customerProfiles, eq(customerProfiles.customerId, customers.id))
      .where(eq(customers.id, customerId))
      .limit(1);
    return row ?? null;
  }

  async adresse(addressId: string | null) {
    if (!addressId) return null;
    const [row] = await this.db
      .select({ strasse: customerAddresses.strasse, plz: customerAddresses.plz, ort: customerAddresses.ort })
      .from(customerAddresses)
      .where(eq(customerAddresses.id, addressId))
      .limit(1);
    return row ?? null;
  }

  async rezept(ocrResultId: string | null) {
    if (!ocrResultId) return null;
    const [row] = await this.db
      .select({
        patientName: ocrResults.patientName,
        patientGeburtsdatum: ocrResults.patientDob,
        strasse: ocrResults.patientStrasse,
        plz: ocrResults.patientPlz,
        ort: ocrResults.patientOrt,
        arzt: ocrResults.doctorName,
        lanr: ocrResults.doctorLanr,
        diagnose: ocrResults.diagnose,
        hilfsmittel: ocrResults.hilfsmittel,
        hilfsmittelNr: ocrResults.hilfsmittelNr,
        ausstellungsdatum: ocrResults.datum,
        vomKundenKorrigiert: ocrResults.rawEdited,
      })
      .from(ocrResults)
      .where(eq(ocrResults.id, ocrResultId))
      .limit(1);
    return row ?? null;
  }

  async lieferant(supplierProductId: string | null) {
    if (!supplierProductId) return null;
    const [row] = await this.db
      .select({ name: suppliers.name, lieferzeitTage: supplierProducts.deliveryTimeDays })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .where(eq(supplierProducts.id, supplierProductId))
      .limit(1);
    return row ?? null;
  }

  // Unerledigte Aufgaben beider Zielgruppen — die Admin-App zeigt auch, was
  // der Kunde gerade tun soll (z. B. „Liefertermin wählen“).
  aufgaben(supplyId: string) {
    return this.db
      .select({
        id: openActions.id,
        title: openActions.title,
        description: openActions.description,
        actionType: openActions.actionType,
        audience: openActions.audience,
        createdAt: openActions.createdAt,
        assignedAdminId: openActions.assignedAdminId,
        assignedAdminName: sql<string | null>`coalesce(nullif(${adminUsers.name}, ''), ${adminUsers.email})`,
      })
      .from(openActions)
      .leftJoin(adminUsers, eq(openActions.assignedAdminId, adminUsers.id))
      .where(and(eq(openActions.supplyId, supplyId), isNull(openActions.resolvedAt)))
      .orderBy(asc(openActions.createdAt));
  }

  async offenerNotfall(supplyId: string) {
    const [row] = await this.db
      .select({
        id: urgentDeliveryRequests.id,
        grund: urgentDeliveryRequests.reason,
        erreichbarkeit: urgentDeliveryRequests.availability,
        telefon: urgentDeliveryRequests.phone,
        createdAt: urgentDeliveryRequests.createdAt,
      })
      .from(urgentDeliveryRequests)
      .where(and(eq(urgentDeliveryRequests.supplyId, supplyId), isNull(urgentDeliveryRequests.resolvedAt)))
      .limit(1);
    return row ?? null;
  }

  notizen(orderId: string) {
    return this.db
      .select({
        id: orderNotes.id,
        body: orderNotes.body,
        createdAt: orderNotes.createdAt,
        authorAdminId: orderNotes.authorAdminId,
        autor: sql<string>`coalesce(nullif(${adminUsers.name}, ''), ${adminUsers.email})`,
      })
      .from(orderNotes)
      .innerJoin(adminUsers, eq(orderNotes.authorAdminId, adminUsers.id))
      .where(eq(orderNotes.orderId, orderId))
      .orderBy(asc(orderNotes.createdAt));
  }
}
