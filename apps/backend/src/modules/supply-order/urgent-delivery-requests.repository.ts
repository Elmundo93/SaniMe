import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { appointments, urgentDeliveryRequests } from '../../db/schema';

// Notfallanfragen und — nur lesend — die gebuchten Termine einer Versorgung.
// Die Termine gehören dem Appointment-Modul, das seinerseits SupplyOrder
// importiert; ein Import zurück wäre ein Zyklus, daher liest die Versorgungs-
// liste die Tabelle hier direkt.
@Injectable()
export class UrgentDeliveryRequestsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: { supplyId: string; reason: string; availability: string; phone: string | null; openActionId: string }) {
    const [row] = await this.db.insert(urgentDeliveryRequests).values(input).returning();
    return row;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(urgentDeliveryRequests).where(eq(urgentDeliveryRequests.id, id)).limit(1);
    return row ?? null;
  }

  async resolve(id: string, outcome: string) {
    await this.db.update(urgentDeliveryRequests).set({ resolvedAt: new Date(), outcome }).where(eq(urgentDeliveryRequests.id, id));
  }

  listOpenForSupplies(supplyIds: string[]) {
    if (supplyIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(urgentDeliveryRequests)
      .where(and(inArray(urgentDeliveryRequests.supplyId, supplyIds), isNull(urgentDeliveryRequests.resolvedAt)));
  }

  listAppointmentsForSupplies(supplyIds: string[]) {
    if (supplyIds.length === 0) return Promise.resolve([]);
    return this.db
      .select({
        supplyId: appointments.supplyId,
        scheduledStart: appointments.scheduledStart,
        scheduledEnd: appointments.scheduledEnd,
      })
      .from(appointments)
      .where(and(inArray(appointments.supplyId, supplyIds), eq(appointments.status, 'confirmed')));
  }
}
