import { Injectable } from '@nestjs/common';
import { addBusinessDays, applyTimeWindow, DAILY_TIME_WINDOWS } from '@sanime/domain';
import type { TenantContext } from '../../common/repository/tenant-context';
import { CatalogService } from '../catalog/catalog.service';
import { AppointmentsRepository } from './appointments.repository';

const PROCESSING_DAYS = 1; // mirrors lib/terminplanung.ts's bearbeitungstage
const MAX_SEARCH_BUSINESS_DAYS = 30; // ~6 weeks — bounded so a saturated supplier degrades to fewer/zero slots, never hangs

export interface ProposedSlot {
  supplierId: string;
  productId: string;
  start: string;
  end: string;
}

// Real business logic, not a repository swap: capacity counts confirmed
// bookings only (proposeSlots never persists a candidate — see
// appointments.schema.ts), and search degrades gracefully instead of
// throwing when a supplier is saturated. See work/Backendsprint.md Layer 3.
@Injectable()
export class SupplierCalendarService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly appointments: AppointmentsRepository,
  ) {}

  async proposeSlots(tenant: TenantContext, supplierId: string, productId: string, count = 3): Promise<ProposedSlot[]> {
    const supplier = await this.catalog.getSupplier(tenant, supplierId);
    const supplierProduct = await this.catalog.getSupplierProduct(tenant, supplierId, productId);

    let candidateDay = addBusinessDays(new Date(), PROCESSING_DAYS + supplierProduct.deliveryTimeDays);
    const slots: ProposedSlot[] = [];

    for (let daysChecked = 0; daysChecked < MAX_SEARCH_BUSINESS_DAYS && slots.length < count; daysChecked++) {
      const confirmedCount = await this.appointments.countConfirmedForSupplierAndDay(tenant, supplierId, candidateDay);
      if (confirmedCount < supplier.dailyCapacity) {
        const window = DAILY_TIME_WINDOWS[slots.length % DAILY_TIME_WINDOWS.length];
        const { start, end } = applyTimeWindow(candidateDay, window);
        slots.push({ supplierId, productId, start: start.toISOString(), end: end.toISOString() });
      }
      candidateDay = addBusinessDays(candidateDay, 1);
    }

    return slots;
  }
}
