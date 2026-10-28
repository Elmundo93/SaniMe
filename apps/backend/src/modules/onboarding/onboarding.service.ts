import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  consentErteilt,
  einwilligungAktuell,
  findeKrankheitsbild,
  istAbschlussfaehig,
  istKassenartikel,
  istNotfallAnfrage,
  MOBILNUMMER_FEHLER,
  REZEPT_VERSORGUNG_NICHT_VERFUEGBAR,
  normalisiereMobilnummer,
  terminNachGenehmigung,
  telefonVerifiziert,
  transition,
  variantenBezeichnung,
  zahlungBeimCheckoutFaellig,
  type ArtikelVariante,
  type OcrKrankenkasse,
  type OcrResult,
  type OnboardingEvent,
  type OnboardingSession,
  type OnboardingStatus,
  type WarenkorbPosition,
} from '@sanime/domain';
import type { TenantContext } from '../../common/repository/tenant-context';
import { AppointmentsService } from '../appointment/appointments.service';
import { AuditService } from '../audit/audit.service';
import { recordOnboardingTransition } from '../../common/metrics/metrics';
import { withSpan } from '../../common/tracing/tracer';
import { CustomersService } from '../customer/customers.service';
import { CatalogService } from '../catalog/catalog.service';
import { PaymentService } from '../payment/payment.service';
import { SupplyOrderService } from '../supply-order/supply-order.service';
import { VERIFICATION_PROVIDER, type VerificationProvider } from '../verification/ports/verification-provider.port';
import { ConsentsRepository } from '../consents/consents.repository';
import { ConsentGrantsRepository } from '../consents/consent-grants.repository';
import { istVerfuegbar, toProduktVariante } from '../catalog/catalog.mapper';
import { toOcrConfidence, toOcrResult, toProdukt } from './onboarding-session.mapper';
import { OnboardingSessionPositionsRepository } from './onboarding-session-positions.repository';
import { OnboardingSessionsRepository } from './onboarding-sessions.repository';
import { InsurancePoliciesRepository } from '../health-data/insurance-policies.repository';
import { OcrResultsRepository } from '../health-data/ocr-results.repository';
import type { InsurancePolicy, NewOcrResultRow, OnboardingSessionRow } from '../../db/schema';

const VERIFICATION_PURPOSE = 'onboarding_phone';

// Die App erkennt diese Meldung und führt zur Telefonbestätigung.
export const TELEFON_BESTAETIGEN = 'Bitte bestätige deine Telefonnummer, um die Bestellung abzuschließen.';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly sessions: OnboardingSessionsRepository,
    private readonly positions: OnboardingSessionPositionsRepository,
    private readonly consents: ConsentsRepository,
    private readonly consentGrants: ConsentGrantsRepository,
    private readonly ocrResults: OcrResultsRepository,
    private readonly insurancePolicies: InsurancePoliciesRepository,
    private readonly catalog: CatalogService,
    private readonly supplyOrder: SupplyOrderService,
    private readonly appointments: AppointmentsService,
    private readonly payment: PaymentService,
    private readonly auditService: AuditService,
    private readonly customers: CustomersService,
    @Inject(VERIFICATION_PROVIDER) private readonly verification: VerificationProvider,
  ) {}

  /** Neue Bestellung. Schickt das Gerät das Secret seiner bisherigen Sitzung mit
   * und war diese schon einem Kunden zugeordnet, bleibt der Kunde bekannt — sonst
   * sähe er mitten in der neuen Bestellung seine Versorgungen nicht mehr (GET
   * /supplies verlangt eine zugeordnete Sitzung). Gleiche Vertrauensstufe wie
   * bisher: wer das alte Secret hat, sieht diese Versorgungen ohnehin. Ein
   * unbekanntes Secret ist kein Fehler, die Sitzung startet dann ohne Kunden. */
  async createSession(tenant: TenantContext, vorgaengerSecret?: string) {
    const vorgaenger = vorgaengerSecret ? await this.sessions.findBySecretHash(sha256(vorgaengerSecret)) : null;
    const customerId = vorgaenger?.organizationId === tenant.organizationId ? vorgaenger.customerId : null;
    const secret = randomBytes(32).toString('base64url');
    const row = await this.sessions.create(tenant, sha256(secret), customerId);
    if (customerId) {
      await this.auditService.record({
        tenant,
        actorType: 'customer',
        actorId: customerId,
        eventType: 'SessionFromPreviousSession',
        resourceType: 'onboarding_session',
        resourceId: row.id,
      });
    }
    return { sessionId: row.id, sessionSecret: secret };
  }

  // Widerruf der dauerhaften Einwilligung. Der Token selbst ist der Nachweis
  // (wer ihn hat, durfte die Einwilligung übernehmen — darf sie also auch
  // widerrufen). Gehört der Grant einem erkannten Kunden, werden alle seine
  // Grants widerrufen. Bereits laufende Sessions behalten ihre Zustimmung;
  // nur künftige Versorgungen fragen wieder nach. Ein unbekannter Token ist
  // kein Fehler (idempotent, verrät nichts über fremde Tokens).
  async einwilligungWiderrufen(tenant: TenantContext, einwilligungsToken: string) {
    const grant = await this.consentGrants.findActiveByTokenHash(tenant, sha256(einwilligungsToken));
    if (!grant) return;
    await this.consentGrants.revokeById(tenant, grant.id);
    if (grant.customerId) await this.consentGrants.revokeForCustomer(tenant, grant.customerId);
  }

  async getCurrent(tenant: TenantContext, sessionId: string) {
    const row = await this.getRowOrThrow(tenant, sessionId);
    return this.hydrate(tenant, row);
  }

  // supplierId/productId are derived entirely from the persisted positions
  // (never from client input). Ein Termin gilt für die ganze Bestellung — im
  // Pilot liefert ein Lieferant alles; maßgeblich ist die erste Position.
  async proposeAppointmentSlots(tenant: TenantContext, sessionId: string) {
    await this.getRowOrThrow(tenant, sessionId);
    const [erste] = await this.positions.listForSession(tenant, sessionId);
    if (!erste) {
      throw new BadRequestException('Der Warenkorb ist leer');
    }
    const product = await this.catalog.getProduct(tenant, erste.productId);
    const primaryOffer = product.offers[0];
    if (!primaryOffer) {
      throw new BadRequestException('Für dieses Produkt ist aktuell kein Lieferant verfügbar');
    }
    return this.appointments.proposeSlots(tenant, primaryOffer.supplierId, erste.productId);
  }

  // Der Betrag ist die Summe der Selbstzahler-Positionen, serverseitig aus den
  // Katalog-Angeboten berechnet (nie vom Client übernommen). Callable from
  // CHECKOUT or CHECKOUT_FEHLGESCHLAGEN (a retry after a failed payment needs a
  // fresh PaymentIntent).
  async createPaymentIntent(tenant: TenantContext, sessionId: string) {
    const row = await this.getRowOrThrow(tenant, sessionId);
    const domainSession = await this.hydrate(tenant, row);
    if (domainSession.status !== 'CHECKOUT' && domainSession.status !== 'CHECKOUT_FEHLGESCHLAGEN') {
      throw new BadRequestException('Zahlung ist in diesem Status nicht möglich');
    }
    await this.pruefeKontakt(tenant, row, domainSession);
    // Kassenartikel werden ohne Zahlung eingereicht — die gesetzliche
    // Zuzahlung zieht der Leistungserbringer später ein (siehe
    // zahlungBeimCheckoutFaellig in @sanime/domain).
    if (!zahlungBeimCheckoutFaellig(domainSession)) {
      throw new BadRequestException('Für diese Bestellung ist beim Checkout keine Zahlung fällig');
    }
    // Erst zahlen, wenn alles andere stimmt — sonst wäre bezahlt, was der
    // Abschluss danach ablehnt (z.B. ein fehlendes Rezept).
    if (!istAbschlussfaehig(domainSession)) {
      throw new BadRequestException('Bitte vervollständige zuerst deine Bestellung (Rezepte und Termin)');
    }
    return this.payment.createOrReuseIntent(tenant, sessionId, await this.betragBeimCheckoutCents(tenant, sessionId));
  }

  // Selbstzahler-Artikel kosten ihren Angebotspreis, Kassenartikel ohne Rezept
  // unseren Selbstzahlerpreis, Kassenartikel mit Rezept beim Checkout nichts.
  private async betragBeimCheckoutCents(tenant: TenantContext, sessionId: string): Promise<number> {
    const rows = await this.positions.listForSession(tenant, sessionId);
    let summe = 0;
    for (const position of rows) {
      summe += selbstGezahltCents(await this.catalog.getProduct(tenant, position.productId), position.withoutPrescription);
    }
    return summe;
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
    // Eine Schreibweise je Nummer (E.164) — sonst griffen Sendegrenzen und
    // Codeabgleich bei „0151 …“ vs. „+49151…“ ins Leere.
    if (event.type === 'KONTAKT_ERFASST') {
      const telefon = normalisiereMobilnummer(event.telefon);
      if (!telefon) throw new BadRequestException(MOBILNUMMER_FEHLER);
      event = { ...event, telefon };
    }
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
    let uebernommenerGrantId: string | null = null;
    if (event.type === 'EINWILLIGUNG_UEBERNOMMEN') {
      // Der Client behauptet nur — maßgeblich ist der Grant: per Token (auch
      // für Gäste) oder, bei einer bereits zugeordneten Session, per Kunde.
      const grant = event.einwilligungsToken
        ? await this.consentGrants.findActiveByTokenHash(tenant, sha256(event.einwilligungsToken))
        : row.customerId
          ? await this.consentGrants.findLatestActiveForCustomer(tenant, row.customerId)
          : null;
      if (!grant) {
        throw new BadRequestException('Keine gültige Einwilligung zum Übernehmen vorhanden');
      }
      if (!einwilligungAktuell(grant)) {
        throw new BadRequestException('Die Rechtstexte haben sich geändert — bitte stimme erneut zu');
      }
      uebernommenerGrantId = grant.id;
      augmentedEvent = { ...event, agbVersion: grant.agbVersion, datenschutzVersion: grant.datenschutzVersion };
    } else if (
      event.type === 'KRANKENKASSE_OCR_ABGESCHLOSSEN' ||
      event.type === 'KRANKENKASSE_UEBERSPRUNGEN' ||
      event.type === 'WEITER_KRANKENKASSE_BEKANNT'
    ) {
      // Available products are computed server-side (CatalogService), never
      // trusted from the client's event payload — the client's own value is
      // discarded here regardless of what it sent. Nur Kassenprodukte: auf dem
      // Rezept-Weg wählt man eine Versorgung, kein Zubehör/Selbstzahler-Artikel.
      const products = await this.catalog.listProducts(tenant, { nurHilfsmittel: true });
      const produkte = products.map(toProdukt);
      augmentedEvent = { ...event, produkte };
    } else if (event.type === 'WARENKORB_UEBERNOMMEN') {
      // Die Produkte kommen ausschließlich aus dem Katalog — der Client
      // schickt nur IDs. Ob ein Artikel ein Rezept braucht, entscheidet allein
      // die Hilfsmittelnummer des Katalogprodukts.
      const produkte = [];
      const varianten: ArtikelVariante[] = [];
      for (const artikel of event.artikel) {
        if (artikel.krankheitsbildId && !findeKrankheitsbild(artikel.krankheitsbildId)) {
          throw new BadRequestException('Unbekanntes Krankheitsbild');
        }
        const product = await this.catalog.getProduct(tenant, artikel.produktId);
        // Die App deaktiviert die CTA bei „Derzeit nicht bestellbar“ — der
        // Server erzwingt es trotzdem.
        if (!istVerfuegbar(product)) {
          throw new BadRequestException(`„${product.name}“ ist derzeit nicht bestellbar`);
        }
        // Hat ein Produkt Größen/Ausführungen, muss eine davon gewählt sein —
        // sonst wüssten wir bei der Lieferung nicht, was wir schicken.
        const katalogVarianten = await this.catalog.listVariants(tenant, product.id);
        if (katalogVarianten.length > 0 || artikel.varianteId) {
          const gewaehlt = katalogVarianten.find((v) => v.id === artikel.varianteId);
          if (!gewaehlt) {
            throw new BadRequestException(
              katalogVarianten.length > 0
                ? `Bitte wähle eine Größe bzw. Ausführung für „${product.name}“.`
                : `„${product.name}“ gibt es nur in einer Ausführung.`,
            );
          }
          varianten.push({ produktId: product.id, id: gewaehlt.id, bezeichnung: variantenBezeichnung(toProduktVariante(gewaehlt)) });
        }
        produkte.push(toProdukt(product));
      }
      augmentedEvent = { ...event, produkte, varianten };
    } else if (event.type === 'SUPPLY_AUSGEWAEHLT') {
      // Never trust the client's product data: the FSM guard branches on
      // hilfsmittelNr, so the catalog's own product is what it must see.
      const product = await this.catalog.getProduct(tenant, event.produkt.id);
      if (!istVerfuegbar(product)) {
        throw new BadRequestException('Dieses Produkt ist derzeit nicht bestellbar');
      }
      augmentedEvent = { ...event, produkt: toProdukt(product) };
    }

    // Ohne bestellbare Kassenartikel endete der Rezept-Weg in einer leeren
    // Versorgungsauswahl — die App blendet ihn aus, der Server erzwingt es.
    const betrittRezeptWeg =
      (event.type === 'WEITER' && domainSession.status === 'LEISTUNGSUEBERSICHT') || event.type === 'REZEPT_HINZUFUEGEN';
    if (betrittRezeptWeg && !(await this.catalog.rezeptVersorgungVerfuegbar(tenant))) {
      throw new BadRequestException(REZEPT_VERSORGUNG_NICHT_VERFUEGBAR);
    }

    const result = transition(domainSession, augmentedEvent);
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }
    recordOnboardingTransition(event.type);

    await this.applySideEffects(tenant, row, augmentedEvent, extra.ipAddress, uebernommenerGrantId);
    await this.sessions.update(tenant, row.id, { status: result.session.status });

    // Erste vollständige Zustimmung dieser Session → dauerhafter Grant. Der
    // Token wird genau einmal zurückgegeben (die App legt ihn in SecureStore
    // ab); gespeichert wird nur sein Hash.
    let einwilligungsToken: string | undefined;
    if (
      (event.type === 'AGB_AKZEPTIERT' || event.type === 'DATENSCHUTZ_AKZEPTIERT') &&
      consentErteilt(result.session) &&
      einwilligungAktuell({
        agbVersion: result.session.consent.agb.version,
        datenschutzVersion: result.session.consent.datenschutz.version,
      }) &&
      !(await this.consentGrants.existsForSession(tenant, row.id))
    ) {
      einwilligungsToken = randomBytes(32).toString('base64url');
      await this.consentGrants.create(tenant, {
        tokenHash: sha256(einwilligungsToken),
        onboardingSessionId: row.id,
        customerId: row.customerId,
        agbVersion: result.session.consent.agb.version,
        datenschutzVersion: result.session.consent.datenschutz.version,
      });
    }

    if (event.type === 'KONTAKT_ERFASST') {
      const sendResult = await this.verification.sendCode(event.telefon, VERIFICATION_PURPOSE);
      return {
        session: await this.hydrate(tenant, await this.getRowOrThrow(tenant, sessionId)),
        devCode: sendResult.devCode,
        checkUrl: sendResult.checkUrl,
      };
    }

    return { session: await this.hydrate(tenant, await this.getRowOrThrow(tenant, sessionId)), einwilligungsToken };
  }

  // POST .../complete — der Kunde reicht eine Bestellung ein, für die beim
  // Checkout keine Zahlung fällig ist (nur Kassenartikel, kostenlose
  // Selbstzahler-Artikel). Eine Bestellung mit zahlungspflichtigem Anteil
  // scheitert hier am FSM-Guard: die kann nur der verifizierte Stripe-Webhook
  // abschließen.
  einreichen(tenant: TenantContext, sessionId: string) {
    return withSpan('OnboardingService.einreichen', () => this.abschliessen(tenant, sessionId, 'AUFTRAG_EINGEREICHT'));
  }

  // Nur von StripeWebhookController nach einem signaturgeprüften
  // payment_intent.succeeded aufgerufen. bezahltCents ist der Betrag der
  // Zahlung — weicht er vom aktuellen Warenkorb ab (der Kunde hat nach dem
  // Anlegen der Zahlung noch etwas geändert), wird nicht abgeschlossen. Nur
  // der Dev-Zahlungssimulator (ohne echte Zahlung) lässt ihn weg.
  abschliessenNachZahlung(tenant: TenantContext, sessionId: string, bezahltCents?: number) {
    return withSpan('OnboardingService.abschliessenNachZahlung', async () => {
      const erwartet = await this.betragBeimCheckoutCents(tenant, sessionId);
      if (bezahltCents !== undefined && erwartet !== bezahltCents) {
        throw new BadRequestException(`Bezahlter Betrag (${bezahltCents}) passt nicht zur Bestellung (${erwartet})`);
      }
      return this.abschliessen(tenant, sessionId, 'ZAHLUNG_ERFOLGREICH');
    });
  }

  // Legt je Position eine eigene Versorgung an — jede durchläuft ihre eigene
  // Genehmigung/Lieferung. Liefert die ID der ersten (für Zahlung/Session).
  private async abschliessen(tenant: TenantContext, sessionId: string, eventType: 'AUFTRAG_EINGEREICHT' | 'ZAHLUNG_ERFOLGREICH') {
    const row = await this.getRowOrThrow(tenant, sessionId);
    const domainSession = await this.hydrate(tenant, row);

    // Enforces the actual CHECKOUT->ABGESCHLOSSEN FSM edge (status, Rezepte,
    // Termin, Telefon, Zahlung ja/nein) *before* any Supply is created — a
    // rejected completion must never leave an orphaned Supply/Order behind.
    const result = transition(domainSession, { type: eventType });
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }

    await this.pruefeKontakt(tenant, row, domainSession);

    // Ohne Kunden sähe der Besteller seine Versorgung nie (GET /supplies
    // verlangt eine zugeordnete Session) und es gäbe keine Lieferadresse.
    const rezeptMitPerson = domainSession.positionen.find((p) => p.rezept?.patient.name)?.rezept ?? null;
    const { vorname, nachname } = teileName(rezeptMitPerson?.patient.name ?? '');
    const { customerId, addressId } = await this.customers.uebernehmeAusBestellung(tenant, {
      sessionId: row.id,
      customerId: row.customerId,
      vorname,
      nachname,
      telefon: domainSession.customerContact.telefon || null,
      email: domainSession.customerContact.email || null,
      versichertenNr: domainSession.krankenkasse?.versichertenNr ?? '',
      adresse: domainSession.positionen.find((p) => p.rezept?.patient.adresse)?.rezept?.patient.adresse ?? null,
    });

    const rows = await this.positions.listForSession(tenant, row.id);
    const supplyIds: string[] = [];
    const eingereichteIds: string[] = [];
    const versorgungen: { supplyId: string; orderId: string }[] = [];
    for (const position of rows) {
      const product = await this.catalog.getProduct(tenant, position.productId);
      const primaryOffer = product.offers[0];
      // Ohne Rezept gekauft = Selbstzahler-Versorgung: keine HiMi-Nr., kein
      // Rezept, keine Krankenkasse — und der bezahlte Preis als Eigenanteil.
      const eingereicht = !!product.hilfsmittelnummer && !position.withoutPrescription;
      const rezept = domainSession.positionen.find((p) => p.produkt.id === position.productId)?.rezept ?? null;
      const { supplyId, orderId } = await this.supplyOrder.createFromOnboarding(
        tenant,
        {
          onboardingSessionId: row.id,
          customerId,
          productId: position.productId,
          supplierProductId: position.supplierProductId,
          ocrResultId: eingereicht ? position.ocrResultId : null,
          productNameSnapshot: product.name,
          productVariantId: position.productVariantId,
          variantLabelSnapshot: domainSession.positionen.find((p) => p.produkt.id === position.productId)?.variante?.bezeichnung ?? null,
          manufacturerNameSnapshot: product.manufacturerName,
          hilfsmittelNrSnapshot: eingereicht ? product.hilfsmittelnummer : null,
          doctorNameSnapshot: eingereicht ? (rezept?.arzt.name ?? '') : '',
          insurerNameSnapshot: eingereicht ? (rezept?.krankenkasse.name ?? '') : '',
          customerCopaySnapshotCents: eingereicht ? (primaryOffer?.customerCopayCents ?? 0) : selbstGezahltCents(product, position.withoutPrescription),
          vatRateSnapshotPercent: product.vatRatePercent,
          deliveryTimeLabelSnapshot: primaryOffer ? `${primaryOffer.deliveryTimeDays} Werktage` : 'unbekannt',
          deliveryAddressId: addressId,
          ohneGenehmigung: !eingereicht,
        },
        { type: 'customer', id: customerId },
      );
      supplyIds.push(supplyId);
      if (eingereicht) eingereichteIds.push(supplyId);
      versorgungen.push({ supplyId, orderId });
    }

    // Reine Selbstzahler-Bestellung: der an der Kasse gewählte Termin wird
    // jetzt gebucht. Mit Kassenartikeln wählt der Kunde ihn erst nach der
    // Genehmigung (terminNachGenehmigung) — dann gilt eine Notfallanfrage.
    const termin = domainSession.selectedAppointment;
    const lieferant = (await this.catalog.getProduct(tenant, rows[0].productId)).offers[0]?.supplierId;
    if (!terminNachGenehmigung(domainSession) && termin && lieferant) {
      for (const v of versorgungen) {
        await this.appointments.bookForCustomer(tenant, {
          orderId: v.orderId,
          supplierId: lieferant,
          scheduledStart: termin.beginn,
          scheduledEnd: termin.ende,
          addressId,
        });
      }
    }
    if (domainSession.notfall && eingereichteIds[0]) {
      await this.supplyOrder.notfallAnfragen(
        tenant,
        eingereichteIds[0],
        { ...domainSession.notfall, telefon: domainSession.notfall.telefon || domainSession.customerContact.telefon || undefined },
        null,
      );
    }

    await this.sessions.update(tenant, row.id, {
      status: result.session.status,
      supplyId: supplyIds[0],
      bindingConfirmation: true,
      completedAt: new Date(),
    });

    return { supplyId: supplyIds[0], supplyIds };
  }

  async smsStattNetzpruefung(tenant: TenantContext, sessionId: string) {
    const row = await this.getRowOrThrow(tenant, sessionId);
    if (!row.contactPhone || !this.verification.smsStattStillerPruefung) return;
    await this.verification.smsStattStillerPruefung(row.contactPhone, VERIFICATION_PURPOSE);
  }

  // Neue Person (Neukunde oder Bestellung für eine andere Versichertennummer)
  // → bestätigte Telefonnummer nötig. Vorher reichte „keine Nummer angegeben“,
  // und die App übersprang die Bestätigung für jeden schon erkannten Nutzer.
  private async pruefeKontakt(tenant: TenantContext, row: OnboardingSessionRow, session: OnboardingSession) {
    if (!telefonVerifiziert(session)) {
      throw new BadRequestException('Telefonnummer ist noch nicht bestätigt');
    }
    // Die Bestätigung entfällt nur für einen erkannten Kunden, von dem wir schon
    // eine Telefonnummer haben — wer per Rezept/Karte erkannt wurde, aber nie
    // eine Nummer hinterlegt hat, muss sie jetzt angeben (Rückruf, Notfall).
    const bekannt = await this.customers.istBekannterBesteller(tenant, row.customerId, session.krankenkasse?.versichertenNr ?? '');
    const telefonBekannt = bekannt && !!(await this.customers.findById(tenant, row.customerId!))?.phone;
    if (!telefonBekannt && !(session.customerContact.telefon && session.customerContact.telefonVerifiziert)) {
      throw new BadRequestException(TELEFON_BESTAETIGEN);
    }
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
    uebernommenerGrantId: string | null,
  ): Promise<void> {
    switch (event.type) {
      case 'EINWILLIGUNG_UEBERNOMMEN':
        // Neue consents-Zeilen für diese Session mit eigener IP und Verweis auf
        // den Grant — nachvollziehbar übernommen, nie eine erfundene Zustimmung.
        await this.consents.record(tenant, row.id, 'agb', event.agbVersion, ipAddress, uebernommenerGrantId);
        await this.consents.record(tenant, row.id, 'datenschutz', event.datenschutzVersion, ipAddress, uebernommenerGrantId);
        return;
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
          patientStrasse: event.result.patient.adresse?.strasse ?? null,
          patientPlz: event.result.patient.adresse?.plz ?? null,
          patientOrt: event.result.patient.adresse?.ort ?? null,
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
        // Mirrors the domain transition: the Rezept's Kassendaten become the
        // session's Krankenkasse only if none is known yet (no policy row).
        const { krankenkasse } = event.result;
        if (krankenkasse.versichertenNr && !(await this.insurancePolicies.findBySubject(tenant, 'onboarding_session', row.id))) {
          await this.insurancePolicies.upsertForSubject(tenant, {
            subjectType: 'onboarding_session',
            subjectId: row.id,
            customerId: row.customerId,
            insurerName: krankenkasse.name,
            insurerIk: krankenkasse.ik ?? null,
            insuredNumber: krankenkasse.versichertenNr,
          });
        }
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
      case 'WEITER_KRANKENKASSE_BEKANNT':
        // Krankenkasse schon bekannt (früheres Rezept oder Personalienfeld
        // dieses Rezepts) — die Produktliste kommt dann von hier statt vom
        // Kartenschritt.
        await this.sessions.update(tenant, row.id, { availableProductIds: (event.produkte ?? []).map((p) => p.id) });
        return;
      case 'SUPPLY_AUSGEWAEHLT': {
        // Rezept-zuerst: das eben erfasste Rezept (Scan-Zwischenstand der
        // Session) gehört ab jetzt der Position. supplierProductId ist die
        // einzige Quelle für „welcher Lieferant liefert diese Position“.
        const bestehende = await this.positions.listForSession(tenant, row.id);
        const vorhanden = bestehende.find((p) => p.productId === event.produkt.id);
        const product = await this.catalog.getProduct(tenant, event.produkt.id);
        await this.positions.upsert(tenant, row.id, event.produkt.id, {
          supplierProductId: product.offers[0]?.id ?? null,
          ocrResultId: row.ocrResultId,
          sortOrder: vorhanden?.sortOrder ?? bestehende.length,
        });
        await this.sessions.update(tenant, row.id, { ocrResultId: null });
        return;
      }
      case 'WARENKORB_UEBERNOMMEN': {
        // Abgleich: fehlende Positionen fallen weg, bestehende behalten ihr
        // Rezept (ocrResultId bleibt unangetastet), neue kommen hinzu.
        const bestehende = await this.positions.listForSession(tenant, row.id);
        await this.positions.deleteAllExcept(tenant, row.id, event.produkte.map((p) => p.id));
        for (const [index, artikel] of event.artikel.entries()) {
          const product = await this.catalog.getProduct(tenant, artikel.produktId);
          const vorhanden = bestehende.find((p) => p.productId === artikel.produktId);
          await this.positions.upsert(tenant, row.id, artikel.produktId, {
            supplierProductId: product.offers[0]?.id ?? null,
            krankheitsbildId: artikel.krankheitsbildId ?? vorhanden?.krankheitsbildId ?? null,
            // Vom Server geprüft (siehe patchInner) — nie die rohe Client-ID.
            productVariantId: event.varianten?.find((v) => v.produktId === artikel.produktId)?.id ?? null,
            sortOrder: index,
          });
        }
        return;
      }
      case 'REZEPT_FUER_POSITION':
        await this.sessions.update(tenant, row.id, { activePositionProductId: event.produktId, ocrResultId: null });
        return;
      case 'REZEPT_HINZUFUEGEN':
      case 'ZURUECK_CHECKOUT':
        await this.sessions.update(tenant, row.id, { activePositionProductId: null, ocrResultId: null });
        return;
      case 'REZEPT_BEARBEITEN': {
        // Bearbeiten statt neu scannen: der Scan-Zwischenstand zeigt direkt
        // auf das Rezept der Position, Korrekturen landen dort.
        const position = (await this.positions.listForSession(tenant, row.id)).find((p) => p.productId === event.produktId);
        await this.sessions.update(tenant, row.id, {
          activePositionProductId: event.produktId,
          ocrResultId: position?.ocrResultId ?? null,
        });
        return;
      }
      case 'POSITION_OHNE_REZEPT':
        await this.positions.update(tenant, row.id, event.produktId, { withoutPrescription: event.ohneRezept });
        return;
      case 'REZEPT_ZUGEORDNET':
        if (!row.activePositionProductId) return;
        await this.positions.update(tenant, row.id, row.activePositionProductId, { ocrResultId: row.ocrResultId, withoutPrescription: false });
        await this.sessions.update(tenant, row.id, { activePositionProductId: null, ocrResultId: null });
        return;
      case 'TERMIN_WAEHLEN':
        await this.sessions.update(tenant, row.id, { appointmentSlotsJson: [] });
        return;
      case 'TERMIN_VORSCHLAEGE_BERECHNET':
        await this.sessions.update(tenant, row.id, { appointmentSlotsJson: event.vorschläge });
        return;
      case 'TERMIN_AUSGEWAEHLT':
        await this.sessions.update(tenant, row.id, { selectedAppointmentJson: event.termin });
        return;
      case 'NOTFALL_ANGEFRAGT':
        await this.sessions.update(tenant, row.id, { notfallJson: event.notfall });
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
    const [agb, datenschutz, policy, positionRows] = await Promise.all([
      this.consents.findLatest(tenant, row.id, 'agb'),
      this.consents.findLatest(tenant, row.id, 'datenschutz'),
      this.insurancePolicies.findBySubject(tenant, 'onboarding_session', row.id),
      this.positions.listForSession(tenant, row.id),
    ]);
    const ocrRow = row.ocrResultId ? await this.ocrResults.findById(tenant, row.ocrResultId) : null;

    const availableProductIds = Array.isArray(row.availableProductIds) ? (row.availableProductIds as string[]) : [];
    const verfügbareProdukte = await Promise.all(
      availableProductIds.map(async (id) => toProdukt(await this.catalog.getProduct(tenant, id))),
    );
    const positionen = await Promise.all(positionRows.map((p) => this.hydratePosition(tenant, p, policy)));

    const ocrResult: OcrResult | null = ocrRow ? toOcrResult(ocrRow, policy) : null;
    const krankenkasse: OcrKrankenkasse | null = policy
      ? { name: policy.insurerName, ik: policy.insurerIk ?? undefined, versichertenNr: policy.insuredNumber }
      : null;

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
      krankenkasse,
      verfügbareProdukte,
      positionen,
      aktivePositionId: row.activePositionProductId ?? null,
      terminVorschläge: Array.isArray(row.appointmentSlotsJson) ? (row.appointmentSlotsJson as OnboardingSession['terminVorschläge']) : [],
      selectedAppointment: (row.selectedAppointmentJson as OnboardingSession['selectedAppointment']) ?? null,
      notfall: istNotfallAnfrage(row.notfallJson) ? row.notfallJson : null,
      customerContact: {
        email: row.contactEmail,
        telefon: row.contactPhone,
        telefonVerifiziert: row.contactPhoneVerified,
      },
      versorgungId: row.supplyId,
    };
  }

  private async hydratePosition(
    tenant: TenantContext,
    row: {
      productId: string;
      ocrResultId: string | null;
      krankheitsbildId: string | null;
      withoutPrescription: boolean;
      productVariantId: string | null;
    },
    policy: InsurancePolicy | null,
  ): Promise<WarenkorbPosition> {
    const produkt = toProdukt(await this.catalog.getProduct(tenant, row.productId));
    const ocrRow = istKassenartikel(produkt) && row.ocrResultId ? await this.ocrResults.findById(tenant, row.ocrResultId) : null;
    const variante = row.productVariantId
      ? (await this.catalog.listVariants(tenant, row.productId)).find((v) => v.id === row.productVariantId)
      : undefined;
    return {
      produkt,
      rezept: ocrRow ? toOcrResult(ocrRow, policy) : null,
      rezeptConfidence: ocrRow ? toOcrConfidence(ocrRow.confidence) : null,
      ohneRezept: istKassenartikel(produkt) && row.withoutPrescription,
      krankheitsbildId: row.krankheitsbildId,
      variante: variante ? { id: variante.id, bezeichnung: variantenBezeichnung(toProduktVariante(variante)) } : null,
    };
  }
}

// Was der Kunde für ein Produkt beim Checkout selbst zahlt (Cent), aus dem Katalog-Angebot.
function selbstGezahltCents(
  product: { hilfsmittelnummer: string | null; offers: { customerCopayCents: number; selfPayPriceCents?: number | null }[] },
  ohneRezept: boolean,
): number {
  const angebot = product.offers[0];
  if (!product.hilfsmittelnummer) return angebot?.customerCopayCents ?? 0;
  return ohneRezept ? (angebot?.selfPayPriceCents ?? 0) : 0;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function ocrPatchToDbPatch(patch: Partial<OcrResult>): Partial<NewOcrResultRow> {
  const dbPatch: Partial<NewOcrResultRow> = {};
  if (patch.patient?.name !== undefined) dbPatch.patientName = patch.patient.name;
  if (patch.patient?.dateOfBirth !== undefined) dbPatch.patientDob = patch.patient.dateOfBirth;
  if (patch.patient?.adresse !== undefined) {
    dbPatch.patientStrasse = patch.patient.adresse.strasse;
    dbPatch.patientPlz = patch.patient.adresse.plz;
    dbPatch.patientOrt = patch.patient.adresse.ort;
  }
  if (patch.arzt?.name !== undefined) dbPatch.doctorName = patch.arzt.name;
  if (patch.arzt?.lanr !== undefined) dbPatch.doctorLanr = patch.arzt.lanr;
  if (patch.diagnose !== undefined) dbPatch.diagnose = patch.diagnose;
  if (patch.hilfsmittel !== undefined) dbPatch.hilfsmittel = patch.hilfsmittel;
  if (patch.hilfsmittelNr !== undefined) dbPatch.hilfsmittelNr = patch.hilfsmittelNr;
  if (patch.datum !== undefined) dbPatch.datum = patch.datum;
  return dbPatch;
}

// Die App führt den Namen als „Vorname Nachname“ (Rezept-Parser dreht
// Muster-16-Reihenfolge so um); der letzte Teil ist der Nachname.
function teileName(name: string): { vorname: string; nachname: string } {
  const teile = name.trim().split(/\s+/).filter(Boolean);
  if (teile.length <= 1) return { vorname: '', nachname: teile[0] ?? '' };
  return { vorname: teile.slice(0, -1).join(' '), nachname: teile[teile.length - 1] };
}
