import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, lt } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { appointments, type NewAppointment } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class AppointmentsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(tenant: TenantContext, input: Omit<NewAppointment, 'organizationId' | 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    const [row] = await this.db
      .insert(appointments)
      .values({ organizationId: tenant.organizationId, status: 'confirmed', ...input })
      .returning();
    return row;
  }

  // Counts confirmed bookings only, never candidate slots — proposeSlots()
  // never inserts a row, so this is always an accurate capacity read.
  async countConfirmedForSupplierAndDay(tenant: TenantContext, supplierId: string, day: Date): Promise<number> {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    const rows = await this.db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          this.tenantFilter(appointments.organizationId, tenant),
          eq(appointments.supplierId, supplierId),
          eq(appointments.status, 'confirmed'),
          gte(appointments.scheduledStart, dayStart),
          lt(appointments.scheduledStart, nextDayStart),
        ),
      );
    return rows.length;
  }

  async findForOrder(tenant: TenantContext, orderId: string) {
    const [row] = await this.db
      .select()
      .from(appointments)
      .where(and(this.tenantFilter(appointments.organizationId, tenant), eq(appointments.orderId, orderId)))
      .limit(1);
    return row ?? null;
  }

  // Untenanted, used only by AppointmentReminderJobHandler which has an id
  // and nothing else — same precedent as NotificationsRepository.findById.
  async findById(id: string) {
    const [row] = await this.db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return row ?? null;
  }
}
