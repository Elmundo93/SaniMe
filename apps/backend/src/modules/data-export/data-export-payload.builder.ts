import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import {
  accessLogs,
  auditEntries,
  customerAddresses,
  customerProfiles,
  customers,
  documentVersions,
  documents,
  insurancePolicies,
  ocrResults,
  onboardingSessions,
  openActions,
  orderStatusEvents,
  orders,
  supplies,
  timelineEvents,
} from '../../db/schema';
import type { TenantContext } from '../../common/repository/tenant-context';
import { ConsentsRepository } from '../consents/consents.repository';

// One dedicated, read-only cross-table reader for the Art. 15/20 export
// bundle — kept out of each business module's own repository, since these
// wide-scoped-by-customerId reads exist only for this one compliance
// workflow and none of them serve any business-domain purpose.
@Injectable()
export class DataExportPayloadBuilder {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly consents: ConsentsRepository,
  ) {}

  async build(tenant: TenantContext, customerId: string) {
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    const [profile] = await this.db.select().from(customerProfiles).where(eq(customerProfiles.customerId, customerId));
    const addresses = await this.db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId));
    const onboardingSessionRows = await this.db.select().from(onboardingSessions).where(eq(onboardingSessions.customerId, customerId));

    const supplyRows = await this.db.select().from(supplies).where(eq(supplies.customerId, customerId));
    const supplyIds = supplyRows.map((s) => s.id);

    const orderRows = supplyIds.length ? await this.db.select().from(orders).where(inArray(orders.supplyId, supplyIds)) : [];
    const orderIds = orderRows.map((o) => o.id);

    const orderStatusEventRows = orderIds.length
      ? await this.db.select().from(orderStatusEvents).where(inArray(orderStatusEvents.orderId, orderIds))
      : [];
    const timelineEventRows = supplyIds.length
      ? await this.db.select().from(timelineEvents).where(inArray(timelineEvents.supplyId, supplyIds))
      : [];
    const openActionRows = supplyIds.length ? await this.db.select().from(openActions).where(inArray(openActions.supplyId, supplyIds)) : [];

    // Only populated for sessions claimed after Phase 1 shipped — a session
    // that never got claimed to a customer has no customerId to filter by
    // here, which is correct: an unidentified session isn't this customer's
    // data yet.
    const ocrResultRows = await this.db.select().from(ocrResults).where(eq(ocrResults.customerId, customerId));
    const insurancePolicyRows = await this.db.select().from(insurancePolicies).where(eq(insurancePolicies.customerId, customerId));

    // Known pre-existing gap, not introduced here: onboarding.service.ts
    // currently hardcodes documentId/prescriptionDocumentId to null on OCR
    // completion, so this query is correct against the schema but returns
    // zero documents today until that separate wiring gap is closed.
    const documentIds = [
      ...onboardingSessionRows.flatMap((s) => [s.prescriptionDocumentId, s.insuranceCardDocumentId]),
      ...ocrResultRows.map((r) => r.documentId),
    ].filter((id): id is string => Boolean(id));
    const documentRows = documentIds.length ? await this.db.select().from(documents).where(inArray(documents.id, documentIds)) : [];
    const documentVersionRows = documentRows.length
      ? await this.db.select().from(documentVersions).where(inArray(documentVersions.documentId, documentRows.map((d) => d.id)))
      : [];

    const consentRows = await this.consents.findHistoryForCustomer(tenant, customerId);

    // Two distinct queries, both included deliberately: "what did I do"
    // (actor) vs. "who accessed my data" (resource) — the second is the
    // actual Art. 15 "who processed your data" answer.
    const resourceIds = [...supplyIds, ...orderIds, ...documentIds];
    const auditByActor = await this.db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.actorType, 'customer'), eq(auditEntries.actorId, customerId)));
    const auditByResource = resourceIds.length
      ? await this.db.select().from(auditEntries).where(inArray(auditEntries.resourceId, resourceIds))
      : [];
    const accessByActor = await this.db
      .select()
      .from(accessLogs)
      .where(and(eq(accessLogs.actorType, 'customer'), eq(accessLogs.actorId, customerId)));
    const accessByResource = resourceIds.length
      ? await this.db.select().from(accessLogs).where(inArray(accessLogs.resourceId, resourceIds))
      : [];

    return {
      generatedAt: new Date().toISOString(),
      customer,
      profile: profile ?? null,
      addresses,
      onboardingSessions: onboardingSessionRows,
      supplies: supplyRows,
      orders: orderRows,
      orderStatusEvents: orderStatusEventRows,
      timelineEvents: timelineEventRows,
      openActions: openActionRows,
      ocrResults: ocrResultRows,
      insurancePolicies: insurancePolicyRows,
      documents: documentRows,
      documentVersions: documentVersionRows,
      consents: consentRows,
      auditTrail: { byActor: auditByActor, byResource: auditByResource },
      accessLog: { byActor: accessByActor, byResource: accessByResource },
    };
  }
}
