import 'dotenv/config';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import { ConsentsRepository } from '../consents/consents.repository';
import { ConsentGrantsRepository } from '../consents/consent-grants.repository';
import { OnboardingSessionsRepository } from '../onboarding/onboarding-sessions.repository';
import { AccessLogsRepository } from '../audit/access-logs.repository';
import { AuditEntriesRepository } from '../audit/audit-entries.repository';
import { AuditService } from '../audit/audit.service';
import { OpenActionsRepository } from '../supply-order/open-actions.repository';
import { OrderStatusEventsRepository } from '../supply-order/order-status-events.repository';
import { OrdersRepository } from '../supply-order/orders.repository';
import { SuppliesRepository } from '../supply-order/supplies.repository';
import { SupplyOrderService } from '../supply-order/supply-order.service';
import { TimelineEventsRepository } from '../supply-order/timeline-events.repository';
import { DataExportPayloadBuilder } from './data-export-payload.builder';

const SEEDED_CUSTOMER_ID = '50000000-0000-0000-0000-000000000001';
const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';

describe('DataExportPayloadBuilder (integration)', () => {
  let pool: Pool;
  let builder: DataExportPayloadBuilder;
  let consents: ConsentsRepository;
  let onboardingSessions: OnboardingSessionsRepository;
  let supplyOrder: SupplyOrderService;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    consents = new ConsentsRepository(db);
    builder = new DataExportPayloadBuilder(db, consents, new ConsentGrantsRepository(db));
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

  it('includes the customer, a claimed consent, and a supply/order/timeline/open-action graph; excludes another customer entirely', async () => {
    const session = await onboardingSessions.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);
    await consents.record(DEFAULT_TENANT_CONTEXT, session.id, 'agb', 'v1', null);
    await consents.claimToCustomer(DEFAULT_TENANT_CONTEXT, 'onboarding_session', session.id, SEEDED_CUSTOMER_ID);

    const { supplyId, orderId } = await supplyOrder.createFromOnboarding(
      DEFAULT_TENANT_CONTEXT,
      {
        onboardingSessionId: session.id,
        customerId: SEEDED_CUSTOMER_ID,
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

    const payload = await builder.build(DEFAULT_TENANT_CONTEXT, SEEDED_CUSTOMER_ID);

    expect(payload.customer?.id).toBe(SEEDED_CUSTOMER_ID);
    expect(payload.consents.some((c) => c.subjectId === session.id && c.consentType === 'agb')).toBe(true);
    expect(payload.supplies.some((s) => s.id === supplyId)).toBe(true);
    expect(payload.orders.some((o) => o.id === orderId)).toBe(true);
    expect(payload.timelineEvents.some((t) => t.supplyId === supplyId)).toBe(true);
    expect(payload.openActions.some((a) => a.supplyId === supplyId)).toBe(true);
    expect(payload.orderStatusEvents.some((e) => e.orderId === orderId)).toBe(true);
    // The Art. 15 "who accessed my data" answer, not just "what I did".
    expect(payload.auditTrail.byResource.some((e) => e.resourceId === supplyId)).toBe(true);

    const otherCustomerPayload = await builder.build(DEFAULT_TENANT_CONTEXT, '50000000-0000-0000-0000-000000000099');
    expect(otherCustomerPayload.customer).toBeUndefined();
    expect(otherCustomerPayload.supplies.some((s) => s.id === supplyId)).toBe(false);
  });
});
