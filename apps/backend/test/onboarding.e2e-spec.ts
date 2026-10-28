import 'dotenv/config';
import { createHash } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { seedAdminWithPermissions } from './helpers/seed-admin';
import { configureApp } from '../src/bootstrap';
import { DRIZZLE, type Database } from '../src/db/client';
import { AGB_VERSION, DATENSCHUTZ_VERSION, REZEPT_VERSORGUNG_NICHT_VERFUEGBAR } from '@sanime/domain';
import { auditEntries, consentGrants, consents, customerAddresses, customers, notifications, onboardingSessions, orders, supplies } from '../src/db/schema';
import { testTelefon } from './support/test-telefon';
import { SupplyOrderService } from '../src/modules/supply-order/supply-order.service';
import { CatalogService } from '../src/modules/catalog/catalog.service';
import { DEFAULT_ORGANIZATION_ID, DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';

// The real full-slice proof of Layer 2: create session -> accept consents ->
// upload prescription (Document) -> OCR result (HealthData) -> select
// product (Catalog) -> OTP verify (Verification) -> complete -> Supply +
// Order + Timeline + OpenAction + AuditEntry all exist (Supply/Order).
describe('Onboarding full slice (e2e)', () => {
  const TELEFON = testTelefon();
  let app: INestApplication;
  let adminToken: string;
  let sessionId: string;
  let sessionSecret: string;
  let idempotencyCounter = 0;

  const auth = () => `Bearer ${sessionSecret}`;
  const nextIdempotencyKey = () => `onboarding-e2e-${Date.now()}-${idempotencyCounter++}`;

  function patchEvent(event: unknown, code?: string) {
    return request(app.getHttpServer())
      .patch(`/api/v1/onboarding-sessions/${sessionId}`)
      .set('Authorization', auth())
      .set('Idempotency-Key', nextIdempotencyKey())
      .send({ event, code });
  }

  async function uploadDocument(type: string) {
    const uploadUrlRes = await request(app.getHttpServer())
      .post('/api/v1/documents/upload-url')
      .set('Authorization', auth())
      .send({ mimeType: 'image/jpeg' })
      .expect(201);

    const bytes = Buffer.from(`fake-${type}-bytes`);
    const putRes = await fetch(uploadUrlRes.body.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: bytes,
    });
    expect(putRes.status).toBe(200);

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', auth())
      .send({
        type,
        storageKey: uploadUrlRes.body.storageKey,
        hash: createHash('sha256').update(bytes).digest('hex'),
        mimeType: 'image/jpeg',
        sizeBytes: bytes.byteLength,
      })
      .expect(201);
    return registerRes.body.id as string;
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    // Die Admin-Strategie prüft, dass es die Person wirklich gibt und sie aktiv ist.
    adminToken = (await seedAdminWithPermissions(app, [])).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a session with an opaque secret', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.sessionSecret).toBeTruthy();
    sessionId = res.body.sessionId;
    sessionSecret = res.body.sessionSecret;
  });

  it('rejects PATCH without an Idempotency-Key', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/onboarding-sessions/${sessionId}`)
      .set('Authorization', auth())
      .send({ event: { type: 'WEITER' } })
      .expect(400);
  });

  it('rejects an event with no matching transition (WILLKOMMEN has no AGB_AKZEPTIERT row)', async () => {
    const res = await patchEvent({ type: 'AGB_AKZEPTIERT', version: 'v1' });
    expect(res.status).toBe(400);
  });

  it('walks WILLKOMMEN -> LEISTUNGSUEBERSICHT -> consents -> REZEPT_AUFNAHME', async () => {
    await patchEvent({ type: 'WEITER' }).expect(200);
    await patchEvent({ type: 'AGB_AKZEPTIERT', version: 'v1' }).expect(200);
    await patchEvent({ type: 'DATENSCHUTZ_AKZEPTIERT', version: 'v1' }).expect(200);
    const res = await patchEvent({ type: 'WEITER' }).expect(200);
    expect(res.body.session.status).toBe('REZEPT_AUFNAHME');
    expect(res.body.session.consent.agb.akzeptiert).toBe(true);
    expect(res.body.session.consent.datenschutz.akzeptiert).toBe(true);
  });

  it('rejects advancing past REZEPT_PRUEFUNG before required OCR fields exist', async () => {
    const documentId = await uploadDocument('prescription');
    await patchEvent({
      type: 'REZEPT_OCR_ABGESCHLOSSEN',
      uri: documentId,
      result: {
        patient: { name: '', dateOfBirth: '01.01.1980' },
        arzt: { name: '', lanr: undefined },
        krankenkasse: { name: '', versichertenNr: '' },
        diagnose: '',
        hilfsmittel: '',
        datum: '01.01.2026',
      },
      confidence: { patient: 'low', arzt: 'low', krankenkasse: 'low', diagnose: 'low', hilfsmittel: 'low' },
    }).expect(200);

    const res = await patchEvent({ type: 'WEITER' });
    expect(res.status).toBe(400);
  });

  it('completes REZEPT_PRUEFUNG once required fields are corrected, advances to KRANKENKASSE_AUFNAHME', async () => {
    await patchEvent({
      type: 'FELD_KORRIGIERT',
      patch: {
        patient: { name: 'Max Mustermann', dateOfBirth: '15.03.1972' },
        arzt: { name: 'Dr. med. Sabine Müller', lanr: '123456700' },
        diagnose: 'G82.1',
        hilfsmittel: 'Rollstuhl, faltbar',
      },
    }).expect(200);

    const res = await patchEvent({ type: 'WEITER' }).expect(200);
    expect(res.body.session.status).toBe('KRANKENKASSE_AUFNAHME');
    expect(res.body.session.ocrResult.patient.name).toBe('Max Mustermann');
  });

  it('records the Krankenkasse OCR, computes available products server-side, advances to DATENPRUEFUNG', async () => {
    const documentId = await uploadDocument('insurance_card');
    const res = await patchEvent({
      type: 'KRANKENKASSE_OCR_ABGESCHLOSSEN',
      uri: documentId,
      krankenkasse: { name: 'Techniker Krankenkasse', ik: '260940566', versichertenNr: 'A123456789' },
      confidence: 'high',
      // produkte omitted entirely — optional in the DTO and always
      // recomputed server-side regardless of what a client sends.
    }).expect(200);

    expect(res.body.session.status).toBe('DATENPRUEFUNG');
    expect(res.body.session.ocrResult.krankenkasse.name).toBe('Techniker Krankenkasse');
    expect(res.body.session.verfügbareProdukte.length).toBeGreaterThan(0);
  });

  let selectedProductId: string;

  it('advances DATENPRUEFUNG -> VERSORGUNGSAUSWAHL once patient+krankenkasse+hilfsmittel are complete', async () => {
    const res = await patchEvent({ type: 'WEITER' }).expect(200);
    expect(res.body.session.status).toBe('VERSORGUNGSAUSWAHL');
    selectedProductId = res.body.session.verfügbareProdukte[0].id;
    expect(selectedProductId).toBeTruthy();
  });

  it('rejects SUPPLY_AUSGEWAEHLT for a product that does not exist', async () => {
    const res = await patchEvent({
      type: 'SUPPLY_AUSGEWAEHLT',
      produkt: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'x',
        hersteller: 'x',
        hilfsmittelNr: 'x',
        beschreibung: 'x',
        eigenanteil: 0,
        lieferzeit: 'x',
        kategorie: 'x',
        merkmale: [],
      },
    });
    expect(res.status).toBe(404);
  });

  it('selects a real product into the Checkout hub, asks for an urgent delivery instead of a Termin, then contact -> OTP', async () => {
    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth()).expect(200);
    const produkt = current.body.verfügbareProdukte.find((p: { id: string }) => p.id === selectedProductId);

    let res = await patchEvent({ type: 'SUPPLY_AUSGEWAEHLT', produkt }).expect(200);
    expect(res.body.session.status).toBe('CHECKOUT');
    expect(res.body.session.positionen).toHaveLength(1);
    expect(res.body.session.positionen[0].rezept.patient.name).toBe('Max Mustermann');
    expect(res.body.session.positionen[0].rezept.krankenkasse.name).toBe('Techniker Krankenkasse');
    expect(res.body.session.ocrResult).toBeNull();

    // Kassenartikel: der Liefertermin folgt erst nach der Genehmigung — an
    // der Kasse gibt es stattdessen die Notfalllieferung.
    await patchEvent({ type: 'TERMIN_WAEHLEN' }).expect(400);
    await patchEvent({ type: 'NOTFALL_ANGEFRAGT', notfall: { grund: 'UNBEKANNT', erreichbarkeit: 'VORMITTAG' } }).expect(400);
    res = await patchEvent({ type: 'NOTFALL_ANGEFRAGT', notfall: { grund: 'KRANKENHAUSENTLASSUNG', erreichbarkeit: 'VORMITTAG' } }).expect(200);
    expect(res.body.session.notfall).toEqual({ grund: 'KRANKENHAUSENTLASSUNG', erreichbarkeit: 'VORMITTAG' });

    res = await patchEvent({ type: 'KONTAKT_ERFASST', email: null, telefon: TELEFON }).expect(200);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
    const devCode: string = res.body.devCode;

    const badOtp = await patchEvent({ type: 'OTP_VERIFIZIERT' }, '000000');
    expect(badOtp.status).toBe(400);

    res = await patchEvent({ type: 'OTP_VERIFIZIERT' }, devCode).expect(200);
    expect(res.body.session.customerContact.telefonVerifiziert).toBe(true);

    // Phase 4 (Compliance): both the failed and the succeeded OTP attempt
    // are audited against the session.
    const db: Database = app.get(DRIZZLE);
    const otpAuditEntries = await db.select().from(auditEntries).where(eq(auditEntries.resourceId, sessionId));
    expect(otpAuditEntries.some((e) => e.eventType === 'OtpVerificationFailed')).toBe(true);
    expect(otpAuditEntries.some((e) => e.eventType === 'OtpVerified')).toBe(true);
  });

  let supplyId: string;

  it('never asks for a payment at checkout for a Rezept-Versorgung — the Zuzahlung is collected later', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/onboarding-sessions/${sessionId}/payment-intent`)
      .set('Authorization', auth())
      .set('Idempotency-Key', nextIdempotencyKey())
      .expect(400);
  });

  it('completes onboarding, creating a real Supply/Order/Timeline/OpenAction/AuditEntry set', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/onboarding-sessions/${sessionId}/complete`)
      .set('Authorization', auth())
      .set('Idempotency-Key', nextIdempotencyKey())
      .expect(201);
    expect(res.body.supplyId).toBeTruthy();
    supplyId = res.body.supplyId;

    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth()).expect(200);
    expect(current.body.status).toBe('ABGESCHLOSSEN');
    expect(current.body.versorgungId).toBe(supplyId);
  });

  it('rejects completing without an Idempotency-Key', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/onboarding-sessions/${sessionId}/complete`)
      .set('Authorization', auth())
      .expect(400);
  });

  it('the created Supply has the 5-event timeline, internal tasks incl. the callback, and is admin-visible', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/supplies/${supplyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.status).toBe('submitted');
    expect(res.body.timeline.map((t: { label: string }) => t.label)).toContain('Notfalllieferung angefragt');
    expect(res.body.openActions.map((a: { title: string }) => a.title).sort()).toEqual([
      'Antrag an die Krankenkasse senden',
      'Notfalllieferung: Kunden zurückrufen',
    ]);
    // Die Nummer aus der Kontaktbestätigung gilt als Rückrufnummer.
    expect(res.body.openActions.find((a: { actionType: string }) => a.actionType === 'rueckruf').description).toContain(TELEFON);
    expect(res.body.urgentRequest).toMatchObject({ reason: 'KRANKENHAUSENTLASSUNG' });
    expect(res.body.appointment).toBeNull();
    expect(res.body.productNameSnapshot).toBeTruthy();
  });
});

// Warenkorb: mehrere Produkte in einer Bestellung. Der Warenkorb liegt bis
// „Zur Kasse“ nur auf dem Gerät; WARENKORB_UEBERNOMMEN schickt nur Produkt-IDs,
// der Server holt die Produkte aus dem Katalog. Kassenartikel brauchen je ein
// eigenes Rezept, das im Checkout nachgepflegt wird.
describe('Onboarding Warenkorb (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let idempotencyCounter = 0;
  let kassenartikel: { id: string }[];
  // Kassenartikel mit Größen/Ausführungen (Entwicklungsdaten: Rollator mit zwei Sitzhöhen).
  let mitGroesse: { id: string; varianten: { id: string; attribute: { label: string } }[] };
  let selbstzahlerId: string;
  let nichtBestellbarId: string;

  const nextIdempotencyKey = () => `warenkorb-e2e-${Date.now()}-${idempotencyCounter++}`;

  async function neueSessionMitConsent() {
    const session = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    const sessionId: string = session.body.sessionId;
    const auth = `Bearer ${session.body.sessionSecret}`;
    const patchEvent = (event: unknown, code?: string) =>
      request(app.getHttpServer())
        .patch(`/api/v1/onboarding-sessions/${sessionId}`)
        .set('Authorization', auth)
        .set('Idempotency-Key', nextIdempotencyKey())
        .send({ event, code });
    const complete = () =>
      request(app.getHttpServer())
        .post(`/api/v1/onboarding-sessions/${sessionId}/complete`)
        .set('Authorization', auth)
        .set('Idempotency-Key', nextIdempotencyKey());
    await patchEvent({ type: 'WEITER' }).expect(200);
    await patchEvent({ type: 'AGB_AKZEPTIERT', version: 'v1' }).expect(200);
    await patchEvent({ type: 'DATENSCHUTZ_AKZEPTIERT', version: 'v1' }).expect(200);
    return { sessionId, auth, patchEvent, complete };
  }

  const warenkorb = (...ids: string[]) => ({ type: 'WARENKORB_UEBERNOMMEN', artikel: ids.map((produktId) => ({ produktId })) });

  const rezeptScan = (hilfsmittel: string) => ({
    type: 'REZEPT_OCR_ABGESCHLOSSEN',
    uri: 'file:///lokal/rezept.jpg',
    result: {
      patient: { name: 'Erika Mustermann', dateOfBirth: '01.01.1950' },
      arzt: { name: 'Dr. med. Beispiel' },
      krankenkasse: { name: '', versichertenNr: '' },
      diagnose: 'R26.8',
      hilfsmittel,
      datum: '01.10.2026',
    },
    confidence: { patient: 'high', arzt: 'high', krankenkasse: 'low', diagnose: 'high', hilfsmittel: 'high' },
  });

  // Nur reine Selbstzahler-Bestellungen wählen den Termin an der Kasse.
  async function termin(patchEvent: (event: unknown, code?: string) => request.Test) {
    const slot = { id: 'slot-1', beginn: '2026-08-01T09:00:00.000Z', ende: '2026-08-01T11:00:00.000Z', ort: 'Berlin' };
    await patchEvent({ type: 'TERMIN_WAEHLEN' }).expect(200);
    await patchEvent({ type: 'TERMIN_AUSGEWAEHLT', termin: slot }).expect(200);
  }

  async function kontakt(patchEvent: (event: unknown, code?: string) => request.Test, telefon: string) {
    const kontakt = await patchEvent({ type: 'KONTAKT_ERFASST', email: null, telefon }).expect(200);
    await patchEvent({ type: 'OTP_VERIFIZIERT' }, kontakt.body.devCode).expect(200);
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    // Die Admin-Strategie prüft, dass es die Person wirklich gibt und sie aktiv ist.
    adminToken = (await seedAdminWithPermissions(app, [])).token;
    const products = await request(app.getHttpServer()).get('/api/v1/products?limit=100').expect(200);
    type P = { id: string; hilfsmittelNr?: string; verfuegbar: boolean };
    // Artikel mit Varianten brauchen eine Größe — die allgemeinen Tests nehmen solche ohne.
    type D = P & { varianten: { id: string; attribute: { label: string } }[] };
    const detail = async (p: P): Promise<D> => (await request(app.getHttpServer()).get(`/api/v1/products/${p.id}`).expect(200)).body;
    kassenartikel = [];
    for (const p of products.body.filter((x: P) => x.hilfsmittelNr && x.verfuegbar)) {
      const d = await detail(p);
      if (d.varianten.length > 0) mitGroesse ??= d;
      else if (kassenartikel.length < 2) kassenartikel.push(d);
      if (mitGroesse && kassenartikel.length === 2) break;
    }
    for (const p of products.body.filter((x: P) => !x.hilfsmittelNr && x.verfuegbar)) {
      if ((await detail(p)).varianten.length === 0) {
        selbstzahlerId = p.id;
        break;
      }
    }
    nichtBestellbarId = products.body.find((p: P) => !p.verfuegbar).id;
    expect(kassenartikel).toHaveLength(2);
    expect(mitGroesse).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lehnt den Rezept-Weg ab, solange es keine bestellbaren Kassenartikel gibt — der Warenkorb geht weiter', async () => {
    // Katalog v1 in Produktion: nur Selbstzahler. Die Test-DB hat Platzhalter-Kassenartikel,
    // deshalb wird die Verfügbarkeit hier gezielt abgeschaltet.
    const spy = jest.spyOn(app.get(CatalogService), 'rezeptVersorgungVerfuegbar').mockResolvedValue(false);
    try {
      expect((await request(app.getHttpServer()).get('/api/v1/catalog/angebot').expect(200)).body).toEqual({ rezeptVersorgung: false });
      const { patchEvent } = await neueSessionMitConsent();
      const res = await patchEvent({ type: 'WEITER' }).expect(400);
      expect(res.body.message).toBe(REZEPT_VERSORGUNG_NICHT_VERFUEGBAR);
      await patchEvent(warenkorb(selbstzahlerId)).expect(200);
      expect((await patchEvent({ type: 'REZEPT_HINZUFUEGEN' })).status).toBe(400);
    } finally {
      spy.mockRestore();
    }
  });

  it('verlangt bei Artikeln mit Varianten eine Größe und hält sie bis zur Versorgung fest', async () => {
    const { patchEvent, complete } = await neueSessionMitConsent();
    const [erste, zweite] = mitGroesse.varianten;

    const ohne = await patchEvent(warenkorb(mitGroesse.id)).expect(400);
    expect(ohne.body.message).toContain('Größe');
    // Fremde Variante bzw. Variante für ein Produkt ohne Varianten.
    await patchEvent({ type: 'WARENKORB_UEBERNOMMEN', artikel: [{ produktId: mitGroesse.id, varianteId: '51000000-0000-0000-0000-000000000004' }] }).expect(400);
    await patchEvent({ type: 'WARENKORB_UEBERNOMMEN', artikel: [{ produktId: selbstzahlerId, varianteId: erste.id }] }).expect(400);

    let res = await patchEvent({ type: 'WARENKORB_UEBERNOMMEN', artikel: [{ produktId: mitGroesse.id, varianteId: erste.id }] }).expect(200);
    expect(res.body.session.positionen[0].variante).toEqual({ id: erste.id, bezeichnung: erste.attribute.label });
    // Der Warenkorb gewinnt: eine andere Größe ersetzt die erste.
    res = await patchEvent({ type: 'WARENKORB_UEBERNOMMEN', artikel: [{ produktId: mitGroesse.id, varianteId: zweite.id }] }).expect(200);
    expect(res.body.session.positionen[0].variante.id).toBe(zweite.id);

    await kontakt(patchEvent, testTelefon());
    await patchEvent({ type: 'REZEPT_FUER_POSITION', produktId: mitGroesse.id }).expect(200);
    await patchEvent(rezeptScan('Rollator')).expect(200);
    await patchEvent({ type: 'WEITER' }).expect(200);
    await patchEvent({
      type: 'KRANKENKASSE_OCR_ABGESCHLOSSEN',
      uri: 'file:///lokal/egk.jpg',
      krankenkasse: { name: 'Techniker Krankenkasse', versichertenNr: 'A123456789' },
      confidence: 'high',
    }).expect(200);
    res = await patchEvent({ type: 'REZEPT_ZUGEORDNET' }).expect(200);
    // Auch nach dem Rezept-Spoke (Neuladen aus der DB) ist die Größe noch da.
    expect(res.body.session.positionen[0].variante.bezeichnung).toBe(zweite.attribute.label);

    const done = await complete().expect(201);
    const supply = await request(app.getHttpServer()).get(`/api/v1/supplies/${done.body.supplyId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(supply.body.variantLabelSnapshot).toBe(zweite.attribute.label);
    expect(supply.body.productVariantId).toBe(zweite.id);
  });

  it('übernimmt einen gemischten Warenkorb direkt in den Checkout, Produkte kommen aus dem Katalog', async () => {
    const { patchEvent } = await neueSessionMitConsent();
    const res = await patchEvent({
      ...warenkorb(kassenartikel[0].id, selbstzahlerId),
      // Was der Client an Produktdaten mitschickt, wird verworfen.
      produkte: [{ id: selbstzahlerId, name: 'gefälscht', hersteller: 'x', beschreibung: 'x', eigenanteil: 0, lieferzeit: 'x', kategorie: 'x', merkmale: [] }],
    }).expect(200);
    expect(res.body.session.status).toBe('CHECKOUT');
    expect(res.body.session.positionen.map((p: { produkt: { id: string } }) => p.produkt.id)).toEqual([kassenartikel[0].id, selbstzahlerId]);
    expect(res.body.session.positionen[1].produkt.name).not.toBe('gefälscht');
    expect(res.body.session.positionen[0].rezept).toBeNull();
  });

  it('lehnt nicht bestellbare, unbekannte und doppelte Artikel sowie unbekannte Krankheitsbilder ab', async () => {
    const { patchEvent } = await neueSessionMitConsent();
    const nicht = await patchEvent(warenkorb(nichtBestellbarId));
    expect(nicht.status).toBe(400);
    expect(nicht.body.message).toMatch(/derzeit nicht bestellbar/);
    expect((await patchEvent(warenkorb('00000000-0000-0000-0000-000000000000'))).status).toBe(404);
    expect((await patchEvent(warenkorb(selbstzahlerId, selbstzahlerId))).status).toBe(400);
    expect((await patchEvent(warenkorb())).status).toBe(400);
    const kb = await patchEvent({ type: 'WARENKORB_UEBERNOMMEN', artikel: [{ produktId: selbstzahlerId, krankheitsbildId: 'nicht-existent' }] });
    expect(kb.status).toBe(400);
    // Die entfernten Einzelprodukt-Events gibt es nicht mehr.
    expect((await patchEvent({ type: 'KATALOG_PRODUKT_VORGEMERKT', produktId: selbstzahlerId })).status).toBe(400);
  });

  it('übernimmt die Kassendaten aus dem Rezept, überspringt die Karte und liefert trotzdem die Versorgungen', async () => {
    const { patchEvent } = await neueSessionMitConsent();
    await patchEvent({ type: 'WEITER' }).expect(200);
    const scan = rezeptScan('Rollator');
    let res = await patchEvent({
      ...scan,
      result: { ...scan.result, krankenkasse: { name: 'AOK Niedersachsen', ik: '101234569', versichertenNr: 'Q123456784' } },
    }).expect(200);
    expect(res.body.session.krankenkasse).toEqual({ name: 'AOK Niedersachsen', ik: '101234569', versichertenNr: 'Q123456784' });

    res = await patchEvent({ type: 'WEITER_KRANKENKASSE_BEKANNT' }).expect(200);
    expect(res.body.session.status).toBe('DATENPRUEFUNG');
    // Die Produktliste kommt sonst vom Kartenschritt — hier muss sie der
    // Server beim Überspringen selbst liefern, nur Kassenprodukte.
    expect(res.body.session.verfügbareProdukte.length).toBeGreaterThan(0);
    expect(res.body.session.verfügbareProdukte.every((p: { hilfsmittelNr?: string }) => !!p.hilfsmittelNr)).toBe(true);

    res = await patchEvent({ type: 'WEITER' }).expect(200);
    expect(res.body.session.status).toBe('VERSORGUNGSAUSWAHL');
  });

  it('macht den Besteller beim Abschluss zum Kunden: Versorgung sichtbar, Rezeptadresse als Lieferadresse', async () => {
    const { auth, patchEvent, complete } = await neueSessionMitConsent();
    // Pro Lauf eindeutig — der Neukunden-Fall, nicht der Archivabgleich.
    const versichertenNr = `N${String(Date.now()).slice(-9)}`;
    const adresse = { strasse: 'Beispielweg 7', plz: '12345', ort: 'Musterstadt' };
    await patchEvent({ type: 'WEITER' }).expect(200);
    const scan = rezeptScan('Rollator');
    await patchEvent({
      ...scan,
      result: {
        ...scan.result,
        patient: { ...scan.result.patient, adresse },
        krankenkasse: { name: 'AOK Niedersachsen', versichertenNr },
      },
    }).expect(200);
    await patchEvent({ type: 'WEITER_KRANKENKASSE_BEKANNT' }).expect(200);
    let res = await patchEvent({ type: 'WEITER' }).expect(200);
    expect(res.body.session.ocrResult.patient.adresse).toEqual(adresse);
    await patchEvent({ type: 'SUPPLY_AUSGEWAEHLT', produkt: res.body.session.verfügbareProdukte[0] }).expect(200);
    await kontakt(patchEvent, testTelefon());

    // Vorher: ohne Kunden lehnt GET /supplies die Session ab.
    await request(app.getHttpServer()).get('/api/v1/supplies').set('Authorization', auth).expect(403);
    const done = await complete().expect(201);

    const liste = await request(app.getHttpServer()).get('/api/v1/supplies').set('Authorization', auth).expect(200);
    expect(liste.body.map((s: { id: string }) => s.id)).toContain(done.body.supplyId);

    // Nächste Bestellung auf demselben Gerät: mit dem alten Secret bleibt der
    // Kunde bekannt und sieht seine Versorgungen weiter — ohne bzw. mit einem
    // unbekannten Secret startet die Sitzung ohne Kunden (403 statt fremder Daten).
    const folge = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').set('Authorization', auth).expect(201);
    const folgeListe = await request(app.getHttpServer())
      .get('/api/v1/supplies')
      .set('Authorization', `Bearer ${folge.body.sessionSecret}`)
      .expect(200);
    expect(folgeListe.body.map((s: { id: string }) => s.id)).toContain(done.body.supplyId);
    for (const header of [undefined, 'Bearer unbekanntes-secret']) {
      const anfrage = request(app.getHttpServer()).post('/api/v1/onboarding-sessions');
      const neu = await (header ? anfrage.set('Authorization', header) : anfrage).expect(201);
      await request(app.getHttpServer()).get('/api/v1/supplies').set('Authorization', `Bearer ${neu.body.sessionSecret}`).expect(403);
    }
    // Der Auftrag trägt die Lieferadresse vom Rezept.
    const db = app.get<Database>(DRIZZLE);
    const [auftrag] = await db.select().from(orders).where(eq(orders.supplyId, done.body.supplyId));
    expect(auftrag.deliveryAddressId).toBeTruthy();
    const [lieferadresse] = await db.select().from(customerAddresses).where(eq(customerAddresses.id, auftrag.deliveryAddressId!));
    expect(lieferadresse).toMatchObject(adresse);

    // Ein zweiter Abschluss mit derselben Nummer legt keinen zweiten Kunden an.
    res = await request(app.getHttpServer())
      .post('/api/v1/customers/match')
      .set('Authorization', auth)
      .send({ insuredNumber: versichertenNr })
      .expect(201);
    expect(res.body.customer.lastName).toBe('Mustermann');

    // Nach der Bestellung: der Kunde sieht keine Aufgaben unseres Teams.
    const kundenSicht = (await request(app.getHttpServer()).get('/api/v1/supplies').set('Authorization', auth).expect(200)).body.find(
      (s: { id: string }) => s.id === done.body.supplyId,
    );
    expect(kundenSicht.openActions).toEqual([]);
    await request(app.getHttpServer()).get(`/api/v1/supplies/${done.body.supplyId}/appointment-slots`).set('Authorization', auth).expect(400);

    // Push-Token registrieren (nur mit zugeordnetem Kunden).
    await request(app.getHttpServer()).post('/api/v1/push-tokens').set('Authorization', auth).send({ token: `e2e-${Date.now()}-token-abcdef`, platform: 'ios' }).expect(204);

    // Unser Team versendet den Antrag, die Kasse genehmigt.
    const supplyOrder = app.get(SupplyOrderService);
    const order = await supplyOrder.getOrderForSupply(DEFAULT_TENANT_CONTEXT, done.body.supplyId);
    await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, order.id, { type: 'AntragVersendet' }, { type: 'system', id: null });
    await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, order.id, { type: 'InsuranceApproved' }, { type: 'system', id: null });
    const [benachrichtigung] = await db.select().from(notifications).where(eq(notifications.title, 'Versorgung genehmigt')).orderBy(desc(notifications.createdAt)).limit(1);
    expect(benachrichtigung.data).toEqual({ supplyId: done.body.supplyId });

    let supply = await request(app.getHttpServer()).get(`/api/v1/supplies/${done.body.supplyId}`).set('Authorization', auth).expect(200);
    expect(supply.body.insuranceSubmittedAt).toBeTruthy();
    expect(supply.body.openActions.map((a: { title: string }) => a.title)).toEqual(['Liefertermin wählen']);

    // Der Kunde wählt selbst einen echten Termin — nur aus den Vorschlägen.
    const slots = await request(app.getHttpServer()).get(`/api/v1/supplies/${done.body.supplyId}/appointment-slots`).set('Authorization', auth).expect(200);
    expect(slots.body.length).toBeGreaterThan(0);
    await request(app.getHttpServer())
      .post(`/api/v1/supplies/${done.body.supplyId}/appointment`)
      .set('Authorization', auth)
      .send({ start: '2020-01-01T08:00:00.000Z' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/supplies/${done.body.supplyId}/appointment`)
      .set('Authorization', auth)
      .send({ start: slots.body[0].start })
      .expect(201);
    supply = await request(app.getHttpServer()).get(`/api/v1/supplies/${done.body.supplyId}`).set('Authorization', auth).expect(200);
    expect(new Date(supply.body.appointment.start).toISOString()).toBe(slots.body[0].start);
    expect(supply.body.openActions.filter((a: { resolvedAt: string | null }) => !a.resolvedAt)).toEqual([]);
    await request(app.getHttpServer())
      .post(`/api/v1/supplies/${done.body.supplyId}/appointment`)
      .set('Authorization', auth)
      .send({ start: slots.body[0].start })
      .expect(409);

    // Notfall nachträglich aus der Versorgung, nur einmal.
    await request(app.getHttpServer())
      .post(`/api/v1/supplies/${done.body.supplyId}/notfall`)
      .set('Authorization', auth)
      .send({ grund: 'STURZGEFAHR', erreichbarkeit: 'GANZTAGS', telefon: testTelefon() })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/supplies/${done.body.supplyId}/notfall`)
      .set('Authorization', auth)
      .send({ grund: 'STURZGEFAHR', erreichbarkeit: 'GANZTAGS' })
      .expect(409);
  });

  it('pflegt je Kassenartikel ein eigenes Rezept nach — die Krankenkassenkarte nur einmal', async () => {
    const { patchEvent, complete } = await neueSessionMitConsent();
    await patchEvent({ type: 'WARENKORB_UEBERNOMMEN', artikel: [{ produktId: kassenartikel[0].id, krankheitsbildId: 'mobilitaet' }, { produktId: kassenartikel[1].id }] }).expect(200);
    await kontakt(patchEvent, testTelefon());

    // Rezepte fehlen noch → nicht abschlussfähig; Selbstzahler-Positionen
    // brauchen keins (kein Artikel ohne Hilfsmittelnummer → kein Rezept-Scan).
    expect((await complete()).status).toBe(400);

    let res = await patchEvent({ type: 'REZEPT_FUER_POSITION', produktId: kassenartikel[0].id }).expect(200);
    expect(res.body.session.status).toBe('REZEPT_AUFNAHME');
    expect(res.body.session.aktivePositionId).toBe(kassenartikel[0].id);
    await patchEvent(rezeptScan('Rollstuhl')).expect(200);
    // Krankenkasse noch unbekannt → die Karte muss fotografiert werden.
    expect((await patchEvent({ type: 'WEITER_KRANKENKASSE_BEKANNT' })).status).toBe(400);
    await patchEvent({ type: 'WEITER' }).expect(200);
    await patchEvent({
      type: 'KRANKENKASSE_OCR_ABGESCHLOSSEN',
      uri: 'file:///lokal/egk.jpg',
      krankenkasse: { name: 'Techniker Krankenkasse', versichertenNr: 'A123456789' },
      confidence: 'high',
    }).expect(200);
    res = await patchEvent({ type: 'REZEPT_ZUGEORDNET' }).expect(200);
    expect(res.body.session.status).toBe('CHECKOUT');
    expect(res.body.session.positionen[0].rezept.hilfsmittel).toBe('Rollstuhl');
    expect(res.body.session.positionen[0].krankheitsbildId).toBe('mobilitaet');
    expect(res.body.session.krankenkasse.name).toBe('Techniker Krankenkasse');

    // Zweites Rezept: Karte ist bekannt, also direkt zur Datenprüfung.
    await patchEvent({ type: 'REZEPT_FUER_POSITION', produktId: kassenartikel[1].id }).expect(200);
    res = await patchEvent(rezeptScan('Rollator')).expect(200);
    expect(res.body.session.ocrResult.krankenkasse.name).toBe('Techniker Krankenkasse');
    await patchEvent({ type: 'WEITER_KRANKENKASSE_BEKANNT' }).expect(200);
    res = await patchEvent({ type: 'REZEPT_ZUGEORDNET' }).expect(200);
    expect(res.body.session.positionen.map((p: { rezept: { hilfsmittel: string } }) => p.rezept.hilfsmittel)).toEqual(['Rollstuhl', 'Rollator']);

    // Bearbeiten direkt in der Datenprüfung, Korrektur landet am Rezept der Position.
    await patchEvent({ type: 'REZEPT_BEARBEITEN', produktId: kassenartikel[1].id }).expect(200);
    await patchEvent({ type: 'FELD_KORRIGIERT', patch: { diagnose: 'R26.2' } }).expect(200);
    res = await patchEvent({ type: 'ZURUECK_CHECKOUT' }).expect(200);
    expect(res.body.session.positionen[1].rezept.diagnose).toBe('R26.2');

    // Erneutes Übernehmen des Warenkorbs behält die Rezepte.
    res = await patchEvent(warenkorb(kassenartikel[0].id, kassenartikel[1].id)).expect(200);
    expect(res.body.session.positionen.every((p: { rezept: unknown }) => p.rezept !== null)).toBe(true);

    // Keine Zahlung beim Checkout für reine Kassenartikel; je Position eine Versorgung.
    const done = await complete().expect(201);
    expect(done.body.supplyIds).toHaveLength(2);
    for (const supplyId of done.body.supplyIds) {
      const supply = await request(app.getHttpServer())
        .get(`/api/v1/supplies/${supplyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(supply.body.status).toBe('submitted');
      expect(supply.body.hilfsmittelNrSnapshot).toBeTruthy();
    }
  });

  it('lehnt einen Rezept-Scan für einen Selbstzahler-Artikel ab und verlangt für ihn die Zahlung über Stripe', async () => {
    const { patchEvent, complete, auth } = await neueSessionMitConsent();
    await patchEvent(warenkorb(selbstzahlerId)).expect(200);
    expect((await patchEvent({ type: 'REZEPT_FUER_POSITION', produktId: selbstzahlerId })).status).toBe(400);
    await termin(patchEvent);
    await kontakt(patchEvent, testTelefon());

    // Eine Bestellung mit Selbstzahler-Anteil schließt nur der verifizierte
    // Stripe-Webhook ab (siehe payment.e2e-spec.ts) — nie der Client.
    expect((await complete()).status).toBe(400);
    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth).expect(200);
    expect(current.body.status).toBe('CHECKOUT');
    expect(current.body.versorgungId).toBeNull();
  });

  it('fragt einen per Rezept erkannten Kunden ohne Telefonnummer danach und hinterlegt Telefon und E-Mail', async () => {
    const db = app.get<Database>(DRIZZLE);
    const nr = `G${String(Date.now()).slice(-9)}`;
    const [kunde] = await db
      .insert(customers)
      .values({ organizationId: DEFAULT_ORGANIZATION_ID, firstName: 'Ohne', lastName: 'Telefon', insuredNumber: nr })
      .returning();

    const { auth, patchEvent, complete } = await neueSessionMitConsent();
    await request(app.getHttpServer()).post('/api/v1/customers/match').set('Authorization', auth).send({ insuredNumber: nr }).expect(201);
    await patchEvent({ type: 'WEITER' }).expect(200);
    const scan = rezeptScan('Rollator');
    await patchEvent({ ...scan, result: { ...scan.result, krankenkasse: { name: 'AOK Niedersachsen', versichertenNr: nr } } }).expect(200);
    await patchEvent({ type: 'WEITER_KRANKENKASSE_BEKANNT' }).expect(200);
    const res = await patchEvent({ type: 'WEITER' }).expect(200);
    await patchEvent({ type: 'SUPPLY_AUSGEWAEHLT', produkt: res.body.session.verfügbareProdukte[0] }).expect(200);

    // Erkannt, aber ohne hinterlegte Nummer → Bestätigung ist Pflicht.
    const ohneTelefon = await complete().expect(400);
    expect(ohneTelefon.body.message).toContain('Telefonnummer');

    const telefon = testTelefon();
    const kontakt = await patchEvent({ type: 'KONTAKT_ERFASST', email: 'ohne.telefon@example.org', telefon }).expect(200);
    await patchEvent({ type: 'OTP_VERIFIZIERT' }, kontakt.body.devCode).expect(200);
    await complete().expect(201);

    const [danach] = await db.select().from(customers).where(eq(customers.id, kunde.id));
    expect(danach.phone).toBeTruthy();
    expect(danach.email).toBe('ohne.telefon@example.org');
  });

  it('verlangt die Telefonbestätigung, wenn ein erkannter Kunde für eine andere Person bestellt — die Versorgung gehört dieser Person', async () => {
    const db = app.get<Database>(DRIZZLE);
    const eigeneNr = `E${String(Date.now()).slice(-9)}`;
    const andereNr = `F${String(Date.now()).slice(-9)}`;
    const [besteller] = await db
      .insert(customers)
      .values({ organizationId: DEFAULT_ORGANIZATION_ID, firstName: 'Test', lastName: 'Besteller', insuredNumber: eigeneNr })
      .returning();

    const { sessionId, auth, patchEvent, complete } = await neueSessionMitConsent();
    // Wiedererkannt per Kartenabgleich — die Session gehört jetzt dem Besteller.
    await request(app.getHttpServer()).post('/api/v1/customers/match').set('Authorization', auth).send({ insuredNumber: eigeneNr }).expect(201);

    await patchEvent({ type: 'WEITER' }).expect(200);
    const scan = rezeptScan('Rollator');
    await patchEvent({ ...scan, result: { ...scan.result, krankenkasse: { name: 'AOK Niedersachsen', versichertenNr: andereNr } } }).expect(200);
    await patchEvent({ type: 'WEITER_KRANKENKASSE_BEKANNT' }).expect(200);
    const res = await patchEvent({ type: 'WEITER' }).expect(200);
    await patchEvent({ type: 'SUPPLY_AUSGEWAEHLT', produkt: res.body.session.verfügbareProdukte[0] }).expect(200);

    const ohneTelefon = await complete().expect(400);
    expect(ohneTelefon.body.message).toContain('Telefonnummer');

    await kontakt(patchEvent, testTelefon());
    const done = await complete().expect(201);

    const [supply] = await db.select().from(supplies).where(eq(supplies.id, done.body.supplyId));
    expect(supply.customerId).not.toBe(besteller.id);
    // Steuersatz des Produkts wird für die spätere Rechnung festgehalten.
    expect([7, 19]).toContain(supply.vatRateSnapshotPercent);
    const [person] = await db.select().from(customers).where(eq(customers.id, supply.customerId!));
    expect(person.insuredNumber).toBe(andereNr);
    const [session] = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId));
    expect(session.customerId).toBe(person.id);
  });

  it('kauft einen Kassenartikel ohne Rezept zum Selbstzahlerpreis — nur über die Zahlung abschließbar', async () => {
    const { patchEvent, complete, auth } = await neueSessionMitConsent();
    let res = await patchEvent(warenkorb(kassenartikel[0].id)).expect(200);
    const preis = res.body.session.positionen[0].produkt.selbstzahlerPreis;
    expect(preis).toBeGreaterThan(res.body.session.positionen[0].produkt.eigenanteil);
    await kontakt(patchEvent, testTelefon());
    expect((await complete()).status).toBe(400); // Rezept fehlt noch

    res = await patchEvent({ type: 'POSITION_OHNE_REZEPT', produktId: kassenartikel[0].id, ohneRezept: true }).expect(200);
    expect(res.body.session.positionen[0].ohneRezept).toBe(true);
    // Jetzt ist der Selbstzahlerpreis fällig — /complete darf das nicht abschließen.
    expect((await complete()).status).toBe(400);
    expect((await patchEvent({ type: 'POSITION_OHNE_REZEPT', produktId: selbstzahlerId, ohneRezept: true })).status).toBe(400);

    // Zurück zum Rezept-Weg ist jederzeit möglich.
    res = await patchEvent({ type: 'POSITION_OHNE_REZEPT', produktId: kassenartikel[0].id, ohneRezept: false }).expect(200);
    expect(res.body.session.positionen[0].ohneRezept).toBe(false);
    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth).expect(200);
    expect(current.body.status).toBe('CHECKOUT');
  });

  it('entfernt beim Abgleich Positionen, die nicht mehr im Warenkorb sind', async () => {
    const { patchEvent } = await neueSessionMitConsent();
    await patchEvent(warenkorb(kassenartikel[0].id, selbstzahlerId)).expect(200);
    const res = await patchEvent(warenkorb(selbstzahlerId)).expect(200);
    expect(res.body.session.positionen.map((p: { produkt: { id: string } }) => p.produkt.id)).toEqual([selbstzahlerId]);
  });
});

// Dauerhafte Einwilligung (Katalogplan §2.3): einmal zustimmen, danach für jede
// neue Session übernehmen — solange die Rechtstexte gleich bleiben und der
// Grant nicht widerrufen ist. Der Server prüft, der Client behauptet nur.
describe('Onboarding dauerhafte Einwilligung (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let idempotencyCounter = 0;

  async function neueSession() {
    const session = await request(app.getHttpServer()).post('/api/v1/onboarding-sessions').expect(201);
    const sessionId: string = session.body.sessionId;
    const auth = `Bearer ${session.body.sessionSecret}`;
    const patchEvent = (event: unknown) =>
      request(app.getHttpServer())
        .patch(`/api/v1/onboarding-sessions/${sessionId}`)
        .set('Authorization', auth)
        .set('Idempotency-Key', `einwilligung-e2e-${Date.now()}-${idempotencyCounter++}`)
        .send({ event });
    return { sessionId, patchEvent };
  }

  async function zustimmen(version: { agb: string; datenschutz: string }) {
    const s = await neueSession();
    await s.patchEvent({ type: 'WEITER' }).expect(200);
    const agb = await s.patchEvent({ type: 'AGB_AKZEPTIERT', version: version.agb }).expect(200);
    expect(agb.body.einwilligungsToken).toBeUndefined();
    const ds = await s.patchEvent({ type: 'DATENSCHUTZ_AKZEPTIERT', version: version.datenschutz }).expect(200);
    return ds.body.einwilligungsToken as string | undefined;
  }

  const uebernehmen = (einwilligungsToken?: string) => ({
    type: 'EINWILLIGUNG_UEBERNOMMEN',
    einwilligungsToken,
    agbVersion: AGB_VERSION,
    datenschutzVersion: DATENSCHUTZ_VERSION,
  });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('issues a token once both current consents are given, and takes it over in a new session', async () => {
    const token = await zustimmen({ agb: AGB_VERSION, datenschutz: DATENSCHUTZ_VERSION });
    expect(token).toEqual(expect.any(String));

    const zweite = await neueSession();
    const res = await zweite.patchEvent(uebernehmen(token)).expect(200);
    expect(res.body.session.status).toBe('LEISTUNGSUEBERSICHT');
    expect(res.body.session.consent.agb).toMatchObject({ akzeptiert: true, version: AGB_VERSION });
    expect(res.body.einwilligungsToken).toBeUndefined();

    // Nachvollziehbar übernommen: eigene consents-Zeilen mit Grant-Verweis.
    const zeilen = await db.select().from(consents).where(eq(consents.subjectId, zweite.sessionId));
    expect(zeilen).toHaveLength(2);
    expect(zeilen.every((z) => z.uebernommenVonGrantId !== null)).toBe(true);

    // Danach geht es ohne erneutes Abfragen direkt weiter.
    await zweite.patchEvent({ type: 'WEITER' }).expect(200);
  });

  it('issues no token for outdated legal text versions', async () => {
    expect(await zustimmen({ agb: 'v1', datenschutz: 'v1' })).toBeUndefined();
  });

  it('rejects a missing, unknown or outdated grant', async () => {
    const s = await neueSession();
    expect((await s.patchEvent(uebernehmen())).status).toBe(400);
    expect((await s.patchEvent(uebernehmen('gibt-es-nicht'))).status).toBe(400);

    const veralteterToken = 'veraltet-' + Date.now();
    await db.insert(consentGrants).values({
      organizationId: DEFAULT_ORGANIZATION_ID,
      tokenHash: createHash('sha256').update(veralteterToken).digest('hex'),
      agbVersion: '2000-01-01',
      datenschutzVersion: DATENSCHUTZ_VERSION,
    });
    const alt = await s.patchEvent(uebernehmen(veralteterToken));
    expect(alt.status).toBe(400);
    expect(alt.body.message).toBe('Die Rechtstexte haben sich geändert — bitte stimme erneut zu');

    // Der Client kann keine veralteten Versionen "behaupten" — der FSM-Guard
    // prüft sie schon vor dem Server-Lookup gegen die aktuellen.
    expect((await s.patchEvent({ ...uebernehmen('x'), agbVersion: '2000-01-01' })).status).toBe(400);
  });

  it('stops working after revocation, idempotently and without leaking unknown tokens', async () => {
    const token = await zustimmen({ agb: AGB_VERSION, datenschutz: DATENSCHUTZ_VERSION });
    await request(app.getHttpServer()).post('/api/v1/consent-grants/revoke').send({ einwilligungsToken: token }).expect(204);
    await request(app.getHttpServer()).post('/api/v1/consent-grants/revoke').send({ einwilligungsToken: token }).expect(204);
    await request(app.getHttpServer()).post('/api/v1/consent-grants/revoke').send({ einwilligungsToken: 'unbekannt' }).expect(204);
    await request(app.getHttpServer()).post('/api/v1/consent-grants/revoke').send({}).expect(400);

    const s = await neueSession();
    expect((await s.patchEvent(uebernehmen(token))).status).toBe(400);
  });
});
