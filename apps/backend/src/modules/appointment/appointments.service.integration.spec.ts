import 'dotenv/config';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import type { JobQueue } from '../job-queue/ports/job-queue.port';
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
import { AppointmentsService } from './appointments.service';
import { SupplierCalendarService } from './supplier-calendar.service';

const SEEDED_SUPPLIER_ID = '30000000-0000-0000-0000-000000000001';
const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';

describe('AppointmentsService (integration)', () => {
  let pool: Pool;
  let service: AppointmentsService;
  let supplyOrder: SupplyOrderService;
  let onboardingSessions: OnboardingSessionsRepository;
  let fakeJobQueue: JobQueue;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    const catalog = new CatalogService(new CategoriesRepository(db), new ProductsRepository(db), new SuppliersRepository(db));
    const appointments = new AppointmentsRepository(db);
    const calendar = new SupplierCalendarService(catalog, appointments);
    onboardingSessions = new OnboardingSessionsRepository(db);
    supplyOrder = new SupplyOrderService(
      new SuppliesRepository(db),
      new OrdersRepository(db),
      new OrderStatusEventsRepository(db),
      new TimelineEventsRepository(db),
      new OpenActionsRepository(db),
      new AuditService(new AccessLogsRepository(db), new AuditEntriesRepository(db)),
    );
    fakeJobQueue = { enqueue: jest.fn().mockResolvedValue({ id: 'fake-job' }), registerHandler: jest.fn() };
    service = new AppointmentsService(calendar, appointments, supplyOrder, fakeJobQueue);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createOrderReadyForAppointment(): Promise<string> {
    const session = await onboardingSessions.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);
    const created = await supplyOrder.createFromOnboarding(
      DEFAULT_TENANT_CONTEXT,
      {
        onboardingSessionId: session.id,
        customerId: null,
        productId: SEEDED_PRODUCT_ID,
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
    await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, created.orderId, { type: 'InsuranceApproved' }, { type: 'admin', id: 'test' });
    await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, created.orderId, { type: 'SupplierAssigned' }, { type: 'admin', id: 'test' });
    await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, created.orderId, { type: 'Ordered' }, { type: 'admin', id: 'test' });
    return created.orderId;
  }

  it('books an appointment and fires the AppointmentScheduled transition as one indivisible action', async () => {
    const orderId = await createOrderReadyForAppointment();
    const scheduledStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const scheduledEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

    const appointment = await service.book(
      DEFAULT_TENANT_CONTEXT,
      { orderId, supplierId: SEEDED_SUPPLIER_ID, scheduledStart, scheduledEnd, addressId: null },
      { type: 'admin', id: 'test-admin' },
    );

    expect(appointment.status).toBe('confirmed');

    const order = await supplyOrder.getOrder(DEFAULT_TENANT_CONTEXT, orderId);
    expect(order.status).toBe('appointment_scheduled');

    const found = await service.findForOrder(DEFAULT_TENANT_CONTEXT, orderId);
    expect(found?.id).toBe(appointment.id);

    expect(fakeJobQueue.enqueue).toHaveBeenCalledWith(
      'appointment.reminder',
      { appointmentId: appointment.id },
      expect.objectContaining({ delayMs: expect.any(Number) }),
    );
  });
});
