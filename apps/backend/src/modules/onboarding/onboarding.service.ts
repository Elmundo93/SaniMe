import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  istAbschlussfaehig,
  telefonVerifiziert,
  transition,
  type OcrResult,
  type OnboardingEvent,
  type OnboardingSession,
  type OnboardingStatus,
} from '@sanime/domain';
import type { TenantContext } from '../../common/repository/tenant-context';
import { AppointmentsService } from '../appointment/appointments.service';
import { AuditService } from '../audit/audit.service';
import { recordOnboardingTransition } from '../../common/metrics/metrics';
import { withSpan } from '../../common/tracing/tracer';
import { CatalogService } from '../catalog/catalog.service';
import { PaymentService } from '../payment/payment.service';
import { SupplyOrderService } from '../supply-order/supply-order.service';
import { VERIFICATION_PROVIDER, type VerificationProvider } from '../verification/ports/verification-provider.port';
import { ConsentsRepository } from '../consents/consents.repository';
import { toOcrConfidence, toOcrResult, toProdukt } from './onboarding-session.mapper';
import { OnboardingSessionsRepository } from './onboarding-sessions.repository';
import { InsurancePoliciesRepository } from '../health-data/insurance-policies.repository';
import { OcrResultsRepository } from '../health-data/ocr-results.repository';
import type { NewOcrResultRow, OnboardingSessionRow } from '../../db/schema';

const VERIFICATION_PURPOSE = 'onboarding_phone';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly sessions: OnboardingSessionsRepository,
    private readonly consents: ConsentsRepository,
    private readonly ocrResults: OcrResultsRepository,
    private readonly insurancePolicies: InsurancePoliciesRepository,
    private readonly catalog: CatalogService,
    private readonly supplyOrder: SupplyOrderService,
    private readonly appointments: AppointmentsService,
    private readonly payment: PaymentService,
    private readonly auditService: AuditService,
    @Inject(VERIFICATION_PROVIDER) private readonly verification: VerificationProvider,
  ) {}

  async createSession(tenant: TenantContext) {
    const secret = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(secret).digest('hex');
    const row = await this.sessions.create(tenant, hash);
    return { sessionId: row.id, sessionSecret: secret };
  }

  async getCurrent(tenant: TenantContext, sessionId: string) {
    const row = await this.getRowOrThrow(tenant, sessionId);
    return this.hydrate(tenant, row);
  }

  // supplierId/productId are derived entirely from the persisted session row
  // (never from client input) — the client can't request slots for an
  // arbitrary supplier/product pair, only for whatever it already selected
  // via a prior SUPPLY_AUSGEWAEHLT PATCH.
  async proposeAppointmentSlots(tenant: TenantContext, sessionId: string) {
    const row = await this.getRowOrThrow(tenant, sessionId);
    if (!row.selectedProductId) {
      throw new BadRequestException('Kein Produkt ausgewählt');
    }
    const product = await this.catalog.getProduct(tenant, row.selectedProductId);
    const primaryOffer = product.offers[0];
    if (!primaryOffer) {
      throw new BadRequestException('Für dieses Produkt ist aktuell kein Lieferant verfügbar');
    }
    return this.appointments.proposeSlots(tenant, primaryOffer.supplierId, row.selectedProductId);
  }

  // The Eigenanteil amount is read from the persisted session's selected
  // product server-side (never trusted from the client) — same reasoning as
  // proposeAppointmentSlots. Callable from CHECKOUT or CHECKOUT_FEHLGESCHLAGEN
  // (a retry after a failed payment needs a fresh PaymentIntent).
  async createPaymentIntent(tenant: TenantContext, sessionId: string) {
    const row = await this.getRowOrThrow(tenant, sessionId);
    const domainSession = await this.hydrate(tenant, row);
    if (domainSession.status !== 'CHECKOUT' && domainSession.status !== 'CHECKOUT_FEHLGESCHLAGEN') {
      throw new BadRequestException('Zahlung ist in diesem Status nicht möglich');
    }
    if (!telefonVerifiziert(domainSession)) {
      throw new BadRequestException('Telefonnummer ist noch nicht bestätigt');
    }
    if (!row.selectedProductId) {
      throw new BadRequestException('Kein Produkt ausgewählt');
    }
    const product = await this.catalog.getProduct(tenant, row.selectedProductId);
    const amountCents = product.offers[0]?.customerCopayCents ?? 0;
    return this.payment.createOrReuseIntent(tenant, sessionId, amountCents);
  }

  // Called only by StripeWebhookController on a payment_intent.payment_failed
  // event — mirrors patchInner's shape (load, transition, persist) but has no
  // HTTP-driven inputs, since Stripe is the trigger, not the customer.
  // A no-op if the session already moved on (e.g. a retried webhook delivery
  // arriving after the customer already succeeded on a later attempt).
  async markPaymentFailed(tenant: TenantContext, sessionId: string): Promise<void> {
    const row = await this.getRowOrThrow(tenant, sessionId);
    const domainSession = await this.hydrate(tenant, row);
    const result = transition(domainSession, { type: 'ZAHLUNG_FEHLGESCHLAGEN' });
    if (!result.ok) return;
    await this.sessions.update(tenant, row.id, { status: result.session.status });
  }

  patch(tenant: TenantContext, sessionId: string, event: OnboardingEvent, extra: { ipAddress: string | null; otpCode?: string }) {
    return withSpan('OnboardingService.patch', (span) => {
      span.setAttribute('onboarding.event', event.type);
      return this.patchInner(tenant, sessionId, event, extra);
    });
  }

  private async patchInner(tenant: TenantContext, sessionId: string, event: OnboardingEvent, extra: { ipAddress: string | null; otpCode?: string }) {
    const row = await this.getRowOrThrow(tenant, sessionId);
    const domainSession = await this.hydrate(tenant, row);

    if (event.type === 'OTP_VERIFIZIERT') {
      if (!row.contactPhone || !extra.otpCode) {
        throw new BadRequestException('Kein Bestätigungscode angegeben');
      }
      const valid = await this.verification.verifyCode(row.contactPhone, VERIFICATION_PURPOSE, extra.otpCode);
      await this.auditService.record({
        tenant,
        actorType: 'customer',
        actorId: row.customerId ?? row.id,
        eventType: valid ? 'OtpVerified' : 'OtpVerificationFailed',
        resourceType: 'onboarding_session',
        resourceId: row.id,
      });
      if (!valid) {
        throw new BadRequestException('Bestätigungscode ist ungültig oder abgelaufen');
      }
    }

    let augmentedEvent = event;
    if (event.type === 'KRANKENKASSE_OCR_ABGESCHLOSSEN' || event.type === 'KRANKENKASSE_UEBERSPRUNGEN') {
      // Available products are computed server-side (CatalogService), never
      // trusted from the client's event payload — the client's own value is
      // discarded here regardless of what it sent.
      const products = await this.catalog.listProducts(tenant);
      const produkte = products.map(toProdukt);
      augmentedEvent = { ...event, produkte };
    } else if (event.type === 'KATALOG_PRODUKT_VORGEMERKT') {
      // Never trust the client's branch choice: a self-pay product (no
      // Hilfsmittelnummer) has no business entering the Rezept/Krankenkasse
      // insurance chain this event routes into.
      const product = await this.catalog.assertProductExists(tenant, event.produktId);
      if (!product.hilfsmittelnummer) {
        throw new BadRequestException('Dieses Produkt hat keine Hilfsmittelnummer und kann nicht vorgemerkt werden');
      }
    } else if (event.type === 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT') {
      const product = await this.catalog.getProduct(tenant, event.produkt.id);
      if (product.hilfsmittelnummer) {
        throw new BadRequestException('Dieses Produkt hat eine Hilfsmittelnummer und ist kein Selbstzahler-Artikel');
      }
      augmentedEvent = { ...event, produkt: toProdukt(product) };
    } else if (event.type === 'KRANKHEITSBILD_AUSGEWAEHLT') {
      // Recommendations are always computed server-side from the
      // Krankheitsbild id — never trusted from the client's own event payload.
      const products = await this.catalog.listProductsForKrankheitsbild(tenant, event.krankheitsbildId);
      augmentedEvent = { ...event, produkte: products.map(toProdukt) };
    } else if (event.type === 'KRANKHEITSBILD_PRODUKT_VORGEMERKT') {
      const product = await this.catalog.assertProductExists(tenant, event.produktId);
      if (!product.hilfsmittelnummer) {
        throw new BadRequestException('Dieses Produkt hat keine Hilfsmittelnummer und kann nicht vorgemerkt werden');
      }
    } else if (event.type === 'KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT') {
      const product = await this.catalog.getProduct(tenant, event.produkt.id);
      if (product.hilfsmittelnummer) {
        throw new BadRequestException('Dieses Produkt hat eine Hilfsmittelnummer und ist kein Selbstzahler-Artikel');
      }
      augmentedEvent = { ...event, produkt: toProdukt(product) };
    }

    const result = transition(domainSession, augmentedEvent);
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }
    recordOnboardingTransition(event.type);

    await this.applySideEffects(tenant, row, augmentedEvent, extra.ipAddress);
    await this.sessions.update(tenant, row.id, { status: result.session.status });

    if (event.type === 'KONTAKT_ERFASST') {
      const sendResult = await this.verification.sendCode(event.telefon, VERIFICATION_PURPOSE);
      return { session: await this.hydrate(tenant, await this.getRowOrThrow(tenant, sessionId)), devCode: sendResult.devCode };
    }

    return { session: await this.hydrate(tenant, await this.getRowOrThrow(tenant, sessionId)) };
  }

  complete(tenant: TenantContext, sessionId: string) {
    return withSpan('OnboardingService.complete', () => this.completeInner(tenant, sessionId));
  }

  private async completeInner(tenant: TenantContext, sessionId: string) {
    const row = await this.getRowOrThrow(tenant, sessionId);
    const domainSession = await this.hydrate(tenant, row);

    // Defense in depth: re-validate independently of whatever the client did
    // on the way here, against the persisted session server-side.
    if (!istAbschlussfaehig(domainSession) || !telefonVerifiziert(domainSession)) {
      throw new BadRequestException('Onboarding-Session ist nicht vollständig für den Abschluss');
    }
    if (!row.selectedProductId) {
      throw new BadRequestException('Kein Produkt ausgewählt');
    }

    const product = await this.catalog.getProduct(tenant, row.selectedProductId);
    const primaryOffer = product.offers[0];

    const { supplyId } = await this.supplyOrder.createFromOnboarding(
      tenant,
      {
        onboardingSessionId: row.id,
        customerId: row.customerId,
        productId: row.selectedProductId,
        supplierProductId: row.selectedSupplierProductId,
        ocrResultId: row.ocrResultId,
        productNameSnapshot: product.name,
        manufacturerNameSnapshot: product.manufacturerName,
        hilfsmittelNrSnapshot: product.hilfsmittelnummer,
        doctorNameSnapshot: domainSession.ocrResult?.arzt.name ?? '',
        insurerNameSnapshot: domainSession.ocrResult?.krankenkasse.name ?? '',
        customerCopaySnapshotCents: primaryOffer?.customerCopayCents ?? 0,
        deliveryTimeLabelSnapshot: primaryOffer ? `${primaryOffer.deliveryTimeDays} Werktage` : 'unbekannt',
        deliveryAddressId: null,
      },
      { type: 'customer', id: row.customerId },
    );

    // Enforces the actual CHECKOUT->ABGESCHLOSSEN FSM edge (not just its
    // guard predicate in isolation) — fails if the session isn't in
    // CHECKOUT, exactly like a direct PATCH would.
    const result = transition(domainSession, { type: 'ZAHLUNG_ERFOLGREICH', versorgungId: supplyId });
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }

    await this.sessions.update(tenant, row.id, {
      status: result.session.status,
      supplyId,
      completedAt: new Date(),
    });

    return { supplyId };
  }

  private async getRowOrThrow(tenant: TenantContext, sessionId: string): Promise<OnboardingSessionRow> {
    const row = await this.sessions.findById(tenant, sessionId);
    if (!row) {
      throw new NotFoundException('Onboarding-Session nicht gefunden');
    }
    return row;
  }

  private async applySideEffects(
    tenant: TenantContext,
    row: OnboardingSessionRow,
    event: OnboardingEvent,
    ipAddress: string | null,
  ): Promise<void> {
    switch (event.type) {
      case 'AGB_AKZEPTIERT':
        await this.consents.record(tenant, row.id, 'agb', event.version, ipAddress);
        return;
      case 'DATENSCHUTZ_AKZEPTIERT':
        await this.consents.record(tenant, row.id, 'datenschutz', event.version, ipAddress);
        return;
      case 'REZEPT_OCR_ABGESCHLOSSEN': {
        // DSGVO-Datenminimierung, deliberate: event.uri is only ever a local
        // on-device sandbox path — the app never uploads the source photo,
        // only the OCR-extracted fields below. documentId/
        // prescriptionDocumentId stay null because no server-side document
        // for this photo is ever created; there is nothing to reference.
        const created = await this.ocrResults.create(tenant, {
          subjectType: 'onboarding_session',
          subjectId: row.id,
          documentId: null,
          patientName: event.result.patient.name,
          patientDob: event.result.patient.dateOfBirth,
          doctorName: event.result.arzt.name,
          doctorLanr: event.result.arzt.lanr ?? null,
          diagnose: event.result.diagnose,
          hilfsmittel: event.result.hilfsmittel,
          hilfsmittelNr: event.result.hilfsmittelNr ?? null,
          datum: event.result.datum,
          confidence: event.confidence,
          rawEdited: false,
        });
        await this.sessions.update(tenant, row.id, { prescriptionDocumentId: null, ocrResultId: created.id });
        return;
      }
      case 'FELD_KORRIGIERT': {
        if (!row.ocrResultId) return;
        const dbPatch = ocrPatchToDbPatch(event.patch);
        if (Object.keys(dbPatch).length > 0) {
          await this.ocrResults.patchFields(tenant, row.ocrResultId, dbPatch);
        }
        if (event.patch.krankenkasse) {
          await this.insurancePolicies.upsertForSubject(tenant, {
            subjectType: 'onboarding_session',
            subjectId: row.id,
            customerId: row.customerId,
            insurerName: event.patch.krankenkasse.name ?? '',
            insurerIk: event.patch.krankenkasse.ik ?? null,
            insuredNumber: event.patch.krankenkasse.versichertenNr ?? '',
          });
        }
        return;
      }
      case 'KRANKENKASSE_OCR_ABGESCHLOSSEN': {
        await this.insurancePolicies.upsertForSubject(tenant, {
          subjectType: 'onboarding_session',
          subjectId: row.id,
          customerId: row.customerId,
          insurerName: event.krankenkasse.name,
          insurerIk: event.krankenkasse.ik ?? null,
          insuredNumber: event.krankenkasse.versichertenNr,
        });
        if (row.ocrResultId) {
          const existing = await this.ocrResults.findById(tenant, row.ocrResultId);
          const mergedConfidence = toOcrConfidence(existing?.confidence, event.confidence);
          await this.ocrResults.patchFields(tenant, row.ocrResultId, { confidence: mergedConfidence });
        }
        // Same DSGVO data-minimization rationale as REZEPT_OCR_ABGESCHLOSSEN
        // above — no eGK photo is ever uploaded/stored server-side.
        await this.sessions.update(tenant, row.id, {
          insuranceCardDocumentId: null,
          availableProductIds: event.produkte.map((p) => p.id),
        });
        return;
      }
      case 'KRANKENKASSE_UEBERSPRUNGEN':
        await this.sessions.update(tenant, row.id, {
          insuranceCardSkipped: true,
          availableProductIds: event.produkte.map((p) => p.id),
        });
        return;
      case 'SUPPLY_AUSGEWAEHLT': {
        // Full product (with offers), not just assertProductExists's raw-row
        // check — needed to persist selectedSupplierProductId, the column
        // proposeAppointmentSlots and complete() both read as the single
        // source of truth for "which supplier is fulfilling this order."
        const product = await this.catalog.getProduct(tenant, event.produkt.id);
        await this.sessions.update(tenant, row.id, {
          selectedProductId: event.produkt.id,
          selectedSupplierProductId: product.offers[0]?.id ?? null,
        });
        return;
      }
      case 'KATALOG_PRODUKT_VORGEMERKT':
        await this.sessions.update(tenant, row.id, { preselectedProductId: event.produktId });
        return;
      case 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT': {
        const product = await this.catalog.getProduct(tenant, event.produkt.id);
        await this.sessions.update(tenant, row.id, {
          entryPath: 'KATALOG_SELBSTZAHLER',
          selectedProductId: event.produkt.id,
          selectedSupplierProductId: product.offers[0]?.id ?? null,
        });
        return;
      }
      case 'KRANKHEITSBILD_AUSGEWAEHLT':
        await this.sessions.update(tenant, row.id, { selectedKrankheitsbildId: event.krankheitsbildId });
        return;
      case 'KRANKHEITSBILD_PRODUKT_VORGEMERKT':
        await this.sessions.update(tenant, row.id, { preselectedProductId: event.produktId });
        return;
      case 'KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT': {
        const product = await this.catalog.getProduct(tenant, event.produkt.id);
        await this.sessions.update(tenant, row.id, {
          entryPath: 'KRANKHEITSBILD_SELBSTZAHLER',
          selectedProductId: event.produkt.id,
          selectedSupplierProductId: product.offers[0]?.id ?? null,
        });
        return;
      }
      case 'TERMIN_VORSCHLAEGE_BERECHNET':
        await this.sessions.update(tenant, row.id, { appointmentSlotsJson: event.vorschläge });
        return;
      case 'TERMIN_AUSGEWAEHLT':
        await this.sessions.update(tenant, row.id, { selectedAppointmentJson: event.termin });
        return;
      case 'AUFTRAG_BESTAETIGT':
        await this.sessions.update(tenant, row.id, { bindingConfirmation: true });
        return;
      case 'KONTAKT_ERFASST':
        await this.sessions.update(tenant, row.id, { contactEmail: event.email, contactPhone: event.telefon });
        return;
      case 'OTP_VERIFIZIERT':
        await this.sessions.update(tenant, row.id, { contactPhoneVerified: true });
        return;
      default:
        return;
    }
  }

  private async hydrate(tenant: TenantContext, row: OnboardingSessionRow): Promise<OnboardingSession> {
    const [agb, datenschutz] = await Promise.all([
      this.consents.findLatest(tenant, row.id, 'agb'),
      this.consents.findLatest(tenant, row.id, 'datenschutz'),
    ]);
    const ocrRow = row.ocrResultId ? await this.ocrResults.findById(tenant, row.ocrResultId) : null;
    const policy = ocrRow ? await this.insurancePolicies.findBySubject(tenant, 'onboarding_session', row.id) : null;

    const availableProductIds = Array.isArray(row.availableProductIds) ? (row.availableProductIds as string[]) : [];
    const verfügbareProdukte = await Promise.all(
      availableProductIds.map(async (id) => toProdukt(await this.catalog.getProduct(tenant, id))),
    );
    const selectedSupply = row.selectedProductId ? toProdukt(await this.catalog.getProduct(tenant, row.selectedProductId)) : null;

    const ocrResult: OcrResult | null = ocrRow ? toOcrResult(ocrRow, policy) : null;

    return {
      id: row.id,
      status: row.status as OnboardingStatus,
      erstellt: row.createdAt.toISOString(),
      aktualisiert: row.updatedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      consent: {
        agb: agb
          ? { akzeptiert: true, version: agb.version, zeitpunkt: agb.acceptedAt.toISOString(), ipAdresse: agb.ipAddress ?? undefined }
          : { akzeptiert: false, version: '', zeitpunkt: null },
        datenschutz: datenschutz
          ? {
              akzeptiert: true,
              version: datenschutz.version,
              zeitpunkt: datenschutz.acceptedAt.toISOString(),
              ipAdresse: datenschutz.ipAddress ?? undefined,
            }
          : { akzeptiert: false, version: '', zeitpunkt: null },
      },
      rezeptFotoUri: row.prescriptionDocumentId,
      krankenkasseFotoUri: row.insuranceCardDocumentId,
      krankenkasseUebersprungen: row.insuranceCardSkipped,
      ocrResult,
      ocrConfidence: ocrRow ? toOcrConfidence(ocrRow.confidence) : null,
      ocrBearbeitet: ocrRow?.rawEdited ?? false,
      verfügbareProdukte,
      selectedSupply,
      vorausgewaehltesProduktId: row.preselectedProductId ?? null,
      ausgewaehltesKrankheitsbildId: row.selectedKrankheitsbildId ?? null,
      eintrittspfad: (row.entryPath as OnboardingSession['eintrittspfad']) ?? 'REZEPT',
      terminVorschläge: Array.isArray(row.appointmentSlotsJson) ? (row.appointmentSlotsJson as OnboardingSession['terminVorschläge']) : [],
      selectedAppointment: (row.selectedAppointmentJson as OnboardingSession['selectedAppointment']) ?? null,
      verbindlicheBestätigung: row.bindingConfirmation,
      customerContact: {
        email: row.contactEmail,
        telefon: row.contactPhone,
        telefonVerifiziert: row.contactPhoneVerified,
      },
      versorgungId: row.supplyId,
    };
  }
}

function ocrPatchToDbPatch(patch: Partial<OcrResult>): Partial<NewOcrResultRow> {
  const dbPatch: Partial<NewOcrResultRow> = {};
  if (patch.patient?.name !== undefined) dbPatch.patientName = patch.patient.name;
  if (patch.patient?.dateOfBirth !== undefined) dbPatch.patientDob = patch.patient.dateOfBirth;
  if (patch.arzt?.name !== undefined) dbPatch.doctorName = patch.arzt.name;
  if (patch.arzt?.lanr !== undefined) dbPatch.doctorLanr = patch.arzt.lanr;
  if (patch.diagnose !== undefined) dbPatch.diagnose = patch.diagnose;
  if (patch.hilfsmittel !== undefined) dbPatch.hilfsmittel = patch.hilfsmittel;
  if (patch.hilfsmittelNr !== undefined) dbPatch.hilfsmittelNr = patch.hilfsmittelNr;
  if (patch.datum !== undefined) dbPatch.datum = patch.datum;
  return dbPatch;
}
