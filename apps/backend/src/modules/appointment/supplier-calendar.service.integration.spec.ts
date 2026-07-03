import 'dotenv/config';
import { randomUUID } from 'crypto';
import { addBusinessDays } from '@sanime/domain';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { suppliers, supplierProducts } from '../../db/schema';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import { OnboardingSessionsRepository } from '../onboarding/onboarding-sessions.repository';
import { AccessLogsRepository } from '../audit/access-logs.repository';
import { AuditEntriesRepository } from '../audit/audit-entries.repository';
import { AuditService } from '../audit/audit.service';
import { CategoriesRepository } from '../catalog/categories.repository';
import { CatalogService } from '../catalog/catalog.service';
import { ProductsRepository } from '../catalog/products.repository';
import { SuppliersRepository } from '../catalog/suppliers.repository';
import { OpenActionsRepository } from '../supply-order/open-actions.repository';
import { OrderStatusEventsRepository } from '../supply-order/order-status-events.repository';
import { OrdersRepository } from '../supply-order/orders.repository';
import { SuppliesRepository } from '../supply-order/supplies.repository';
import { SupplyOrderService } from '../supply-order/supply-order.service';
import { TimelineEventsRepository } from '../supply-order/timeline-events.repository';
import { AppointmentsRepository } from './appointments.repository';
import { SupplierCalendarService } from './supplier-calendar.service';

// Seeded via src/db/seed/catalog.seed.ts.
const SEEDED_SUPPLIER_ID = '30000000-0000-0000-0000-000000000001';
const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001'; // deliveryTimeDays: 3

describe('SupplierCalendarService (integration)', () => {
  let pool: Pool;
  let calendar: SupplierCalendarService;
  let appointments: AppointmentsRepository;
  let supplyOrder: SupplyOrderService;
  let onboardingSessions: OnboardingSessionsRepository;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    const catalog = new CatalogService(new CategoriesRepository(db), new ProductsRepository(db), new SuppliersRepository(db));
    appointments = new AppointmentsRepository(db);
    calendar = new SupplierCalendarService(catalog, appointments);
    onboardingSessions = new OnboardingSessionsRepository(db);
    supplyOrder = new SupplyOrderService(
      new SuppliesRepository(db),
      new OrdersRepository(db),
      new OrderStatusEventsRepository(db),
      new TimelineEventsRepository(db),
      new OpenActionsRepository(db),
      new AuditService(new AccessLogsRepository(db), new AuditEntriesRepository(db)),
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createThrowawaySupplyOrder(productId: string) {
    const session = await onboardingSessions.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);
    return supplyOrder.createFromOnboarding(
      DEFAULT_TENANT_CONTEXT,
      {
        onboardingSessionId: session.id,
        customerId: null,
        productId,
        supplierProductId: null,
        ocrResultId: null,
        productNameSnapshot: 'Test-Produkt',
        manufacturerNameSnapshot: 'Test-Hersteller',
        hilfsmittelNrSnapshot: '00.00.00.0001',
        customerCopaySnapshotCents: 1000,
        deliveryTimeLabelSnapshot: '3-5 Werktage',
        deliveryAddressId: null,
      },
      { type: 'system', id: null },
    );
  }

  it('proposes slots anchored on deliveryTimeDays, cycling through the fixed daily windows', async () => {
    const slots = await calendar.proposeSlots(DEFAULT_TENANT_CONTEXT, SEEDED_SUPPLIER_ID, SEEDED_PRODUCT_ID, 3);

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const start = new Date(slot.start);
      expect(start.getDay()).not.toBe(0);
      expect(start.getDay()).not.toBe(6);
    }
  });

  it('skips a day once its confirmed-booking count reaches supplier.dailyCapacity', async () => {
    const db = createDatabase(pool);
    const throwawaySupplierId = randomUUID();
    await db.insert(suppliers).values({
      id: throwawaySupplierId,
      organizationId: DEFAULT_TENANT_CONTEXT.organizationId,
      name: 'Test-Lieferant (Kapazität 1)',
      dailyCapacity: 1,
    });
    await db.insert(supplierProducts).values({
      organizationId: DEFAULT_TENANT_CONTEXT.organizationId,
      supplierId: throwawaySupplierId,
      productId: SEEDED_PRODUCT_ID,
      deliveryTimeDays: 2,
    });

    const anchorDay = addBusinessDays(new Date(), 1 + 2); // PROCESSING_DAYS(1) + deliveryTimeDays(2)

    const { supplyId, orderId } = await createThrowawaySupplyOrder(SEEDED_PRODUCT_ID);
    const bookedStart = new Date(anchorDay);
    bookedStart.setHours(9, 0, 0, 0);
    const bookedEnd = new Date(anchorDay);
    bookedEnd.setHours(11, 0, 0, 0);
    await appointments.create(DEFAULT_TENANT_CONTEXT, {
      supplyId,
      orderId,
      supplierId: throwawaySupplierId,
      scheduledStart: bookedStart,
      scheduledEnd: bookedEnd,
      addressId: null,
    });

    const slots = await calendar.proposeSlots(DEFAULT_TENANT_CONTEXT, throwawaySupplierId, SEEDED_PRODUCT_ID, 1);

    expect(slots).toHaveLength(1);
    const proposedDay = new Date(slots[0].start);
    expect(proposedDay.toDateString()).not.toBe(anchorDay.toDateString());
    expect(proposedDay.getTime()).toBeGreaterThan(anchorDay.getTime());
  });
});
