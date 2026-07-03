import 'dotenv/config';
import { eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { auditEntries } from '../../db/schema';
import { DEFAULT_TENANT_CONTEXT } from '../../common/repository/tenant-context';
import { AccessLogsRepository } from '../audit/access-logs.repository';
import { AuditEntriesRepository } from '../audit/audit-entries.repository';
import { AuditService } from '../audit/audit.service';
import { OnboardingSessionsRepository } from '../onboarding/onboarding-sessions.repository';
import { OpenActionsRepository } from './open-actions.repository';
import { OrderStatusEventsRepository } from './order-status-events.repository';
import { OrdersRepository } from './orders.repository';
import { SupplyOrderService } from './supply-order.service';
import { SuppliesRepository } from './supplies.repository';
import { TimelineEventsRepository } from './timeline-events.repository';

// Runs against the real docker-compose Postgres, seeded via
// src/db/seed/catalog.seed.ts. supplies.onboarding_session_id carries a real
// FK to onboarding_sessions (added in Phase 2.6) — a throwaway session row
// is created per test rather than a bare random UUID.
const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';

describe('SupplyOrderService (integration)', () => {
  let pool: Pool;
  let service: SupplyOrderService;
  let onboardingSessions: OnboardingSessionsRepository;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    const db = createDatabase(pool);
    onboardingSessions = new OnboardingSessionsRepository(db);
    service = new SupplyOrderService(
      new SuppliesRepository(db),
      new OrdersRepository(db),
      new OrderStatusEventsRepository(db),
      new TimelineEventsRepository(db),
      new OpenActionsRepository(db),
      new AuditService(new AccessLogsRepository(db), new AuditEntriesRepository(db)),
    );
  });

  async function createThrowawaySession(): Promise<string> {
    const row = await onboardingSessions.create(DEFAULT_TENANT_CONTEXT, `test-hash-${Math.random()}`);
    return row.id;
  }

  afterAll(async () => {
    await pool.end();
  });

  it('replays the onboarding-completion sequence, persisting 5 status events, a timeline, an open action, and audit entries', async () => {
    const result = await service.createFromOnboarding(
      DEFAULT_TENANT_CONTEXT,
      {
        onboardingSessionId: await createThrowawaySession(),
        customerId: null,
        productId: SEEDED_PRODUCT_ID,
        supplierProductId: null,
        ocrResultId: null,
        productNameSnapshot: 'Rollstuhl Aktiv SB 40',
        manufacturerNameSnapshot: 'MobilTech',
        hilfsmittelNrSnapshot: '00.00.00.0001',
        customerCopaySnapshotCents: 1000,
        deliveryTimeLabelSnapshot: '3-5 Werktage',
        deliveryAddressId: null,
      },
      { type: 'system', id: null },
    );

    expect(result.status).toBe('submitted');

    const supply = await service.getSupply(DEFAULT_TENANT_CONTEXT, result.supplyId);
    expect(supply.status).toBe('submitted');
    expect(supply.timeline).toHaveLength(5);
    expect(supply.timeline.every((t) => t.completed)).toBe(true);
    // Only 'Submitted' opens an admin action in this replay sequence.
    expect(supply.openActions).toHaveLength(1);
    expect(supply.openActions[0].title).toBe('Krankenkasse kontaktieren');

    const order = await service.getOrder(DEFAULT_TENANT_CONTEXT, result.orderId);
    expect(order.status).toBe('submitted');

    const db = createDatabase(pool);
    const recordedAuditEntries = await db
      .select()
      .from(auditEntries)
      .where(eq(auditEntries.resourceId, result.supplyId));
    expect(recordedAuditEntries).toHaveLength(5);
  });

  it('drives an admin transition via transitionOrder and rejects an invalid one', async () => {
    const result = await service.createFromOnboarding(
      DEFAULT_TENANT_CONTEXT,
      {
        onboardingSessionId: await createThrowawaySession(),
        customerId: null,
        productId: SEEDED_PRODUCT_ID,
        supplierProductId: null,
        ocrResultId: null,
        productNameSnapshot: 'Rollstuhl Aktiv SB 40',
        manufacturerNameSnapshot: 'MobilTech',
        hilfsmittelNrSnapshot: '00.00.00.0001',
        customerCopaySnapshotCents: 1000,
        deliveryTimeLabelSnapshot: '3-5 Werktage',
        deliveryAddressId: null,
      },
      { type: 'system', id: null },
    );

    const approved = await service.transitionOrder(
      DEFAULT_TENANT_CONTEXT,
      result.orderId,
      { type: 'InsuranceApproved' },
      { type: 'admin', id: 'test-admin' },
    );
    expect(approved.status).toBe('approved');

    await expect(
      service.transitionOrder(DEFAULT_TENANT_CONTEXT, result.orderId, { type: 'Delivered' }, { type: 'admin', id: 'test-admin' }),
    ).rejects.toThrow();
  });
});
