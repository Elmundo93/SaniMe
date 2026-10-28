import 'dotenv/config';
import { eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import { auditEntries, customers, supplies } from '../../db/schema';
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
import { UrgentDeliveryRequestsRepository } from './urgent-delivery-requests.repository';
import type { NotificationsService } from '../notification/notifications.service';

// Runs against the real docker-compose Postgres, seeded via
// src/db/seed/catalog.seed.ts. supplies.onboarding_session_id carries a real
// FK to onboarding_sessions (added in Phase 2.6) — a throwaway session row
// is created per test rather than a bare random UUID.
const SEEDED_PRODUCT_ID = '40000000-0000-0000-0000-000000000001';

describe('SupplyOrderService (integration)', () => {
  let pool: Pool;
  let service: SupplyOrderService;
  let onboardingSessions: OnboardingSessionsRepository;

  const notifications = { notifyCustomer: jest.fn() } as unknown as NotificationsService;

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
      new UrgentDeliveryRequestsRepository(db),
      notifications,
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
    // Only 'Submitted' opens an action in this replay sequence — an internal one.
    expect(supply.openActions).toHaveLength(1);
    expect(supply.openActions[0].title).toBe('Antrag an die Krankenkasse senden');
    expect(supply.openActions[0].audience).toBe('intern');

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

  function input(overrides: Record<string, unknown> = {}) {
    return createThrowawaySession().then((onboardingSessionId) => ({
      onboardingSessionId,
      customerId: null,
      productId: SEEDED_PRODUCT_ID,
      supplierProductId: null,
      ocrResultId: null,
      productNameSnapshot: 'Rollstuhl Aktiv SB 40',
      manufacturerNameSnapshot: 'MobilTech',
      hilfsmittelNrSnapshot: '00.00.00.0001' as string | null,
      customerCopaySnapshotCents: 1000,
      deliveryTimeLabelSnapshot: '3-5 Werktage',
      deliveryAddressId: null,
      ...overrides,
    }));
  }
  const admin = { type: 'admin' as const, id: 'test-admin' };

  it('follows the insurer process: sent → approved, with timestamps, step tasks and a customer task', async () => {
    const result = await service.createFromOnboarding(DEFAULT_TENANT_CONTEXT, await input(), { type: 'system', id: null });

    await service.transitionOrder(DEFAULT_TENANT_CONTEXT, result.orderId, { type: 'AntragVersendet' }, admin);
    const versendet = await service.getSupply(DEFAULT_TENANT_CONTEXT, result.supplyId);
    expect(versendet.status).toBe('insurance_review');
    expect(versendet.insuranceSubmittedAt).not.toBeNull();
    const offen = versendet.openActions.filter((a) => !a.resolvedAt).map((a) => a.title);
    // „Antrag senden“ erledigt sich mit dem Versand von selbst.
    expect(offen).toEqual(['Antwort der Krankenkasse nachhalten']);

    await service.transitionOrder(DEFAULT_TENANT_CONTEXT, result.orderId, { type: 'InsuranceApproved' }, admin);
    const genehmigt = await service.getSupply(DEFAULT_TENANT_CONTEXT, result.supplyId);
    expect(genehmigt.insuranceDecidedAt).not.toBeNull();
    const offenNachher = genehmigt.openActions.filter((a) => !a.resolvedAt);
    expect(offenNachher.map((a) => [a.audience, a.actionType]).sort()).toEqual([
      ['intern', 'schritt'],
      ['kunde', 'termin'],
    ]);
  });

  it('shows customers only their own tasks and notifies them about insurer events', async () => {
    const supplyIn = await input();
    const result = await service.createFromOnboarding(DEFAULT_TENANT_CONTEXT, supplyIn, { type: 'system', id: null });
    const db = createDatabase(pool);
    const [kunde] = await db.insert(customers).values({ organizationId: DEFAULT_TENANT_CONTEXT.organizationId, firstName: 'Test', lastName: 'Kunde', insuredNumber: `T${Date.now()}` }).returning();
    await db.update(supplies).set({ customerId: kunde.id }).where(eq(supplies.id, result.supplyId));

    const vorher = await service.getSupply(DEFAULT_TENANT_CONTEXT, result.supplyId, kunde.id);
    expect(vorher.openActions).toEqual([]);

    (notifications.notifyCustomer as jest.Mock).mockClear();
    await service.transitionOrder(DEFAULT_TENANT_CONTEXT, result.orderId, { type: 'AntragVersendet' }, admin);
    await service.transitionOrder(DEFAULT_TENANT_CONTEXT, result.orderId, { type: 'InsuranceApproved' }, admin);
    const titel = (notifications.notifyCustomer as jest.Mock).mock.calls.map((c) => c[2].title);
    expect(titel).toEqual(['Antrag versendet', 'Versorgung genehmigt']);
    expect((notifications.notifyCustomer as jest.Mock).mock.calls[1][2].data).toEqual({ supplyId: result.supplyId });

    const [liste] = (await service.listSupplies(DEFAULT_TENANT_CONTEXT, kunde.id)).filter((s) => s.id === result.supplyId);
    expect(liste.openActions.map((a) => a.title)).toEqual(['Liefertermin wählen']);
  });

  it('releases a self-pay supply without an insurer step', async () => {
    const result = await service.createFromOnboarding(
      DEFAULT_TENANT_CONTEXT,
      await input({ hilfsmittelNrSnapshot: null, ohneGenehmigung: true }),
      { type: 'system', id: null },
    );
    expect(result.status).toBe('approved');
    const supply = await service.getSupply(DEFAULT_TENANT_CONTEXT, result.supplyId);
    expect(supply.openActions.filter((a) => !a.resolvedAt).map((a) => a.title)).toEqual(['Lieferant wählen']);
  });

  it('records an urgent delivery request once, as an internal callback task', async () => {
    const result = await service.createFromOnboarding(DEFAULT_TENANT_CONTEXT, await input(), { type: 'system', id: null });
    await service.notfallAnfragen(DEFAULT_TENANT_CONTEXT, result.supplyId, { grund: 'KRANKENHAUSENTLASSUNG', erreichbarkeit: 'VORMITTAG', telefon: '0151 0000000' }, null);

    const supply = await service.getSupply(DEFAULT_TENANT_CONTEXT, result.supplyId);
    expect(supply.urgentRequest).toMatchObject({ reason: 'KRANKENHAUSENTLASSUNG', availability: 'VORMITTAG' });
    const rueckruf = supply.openActions.find((a) => a.actionType === 'rueckruf');
    expect(rueckruf?.audience).toBe('intern');
    expect(supply.timeline.map((t) => t.label)).toContain('Notfalllieferung angefragt');

    await expect(
      service.notfallAnfragen(DEFAULT_TENANT_CONTEXT, result.supplyId, { grund: 'STURZGEFAHR', erreichbarkeit: 'GANZTAGS' }, null),
    ).rejects.toThrow('Deine Anfrage liegt uns schon vor');
  });
});
