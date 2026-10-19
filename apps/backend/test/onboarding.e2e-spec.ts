import 'dotenv/config';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DRIZZLE, type Database } from '../src/db/client';
import { AGB_VERSION, DATENSCHUTZ_VERSION } from '@sanime/domain';
import { auditEntries, consentGrants, consents } from '../src/db/schema';
import { DEFAULT_ORGANIZATION_ID } from '../src/common/repository/tenant-context';

// The real full-slice proof of Layer 2: create session -> accept consents ->
// upload prescription (Document) -> OCR result (HealthData) -> select
// product (Catalog) -> OTP verify (Verification) -> complete -> Supply +
// Order + Timeline + OpenAction + AuditEntry all exist (Supply/Order).
describe('Onboarding full slice (e2e)', () => {
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

    const jwt = app.get(JwtService);
    adminToken = await jwt.signAsync(
      { sub: 'test-admin', email: 'test-admin@example.com' },
      { secret: process.env.ADMIN_JWT_SECRET, expiresIn: '5m' },
    );
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

  it('selects a real product into the Checkout hub, picks a Termin there, then contact -> OTP', async () => {
    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth()).expect(200);
    const produkt = current.body.verfügbareProdukte.find((p: { id: string }) => p.id === selectedProductId);

    let res = await patchEvent({ type: 'SUPPLY_AUSGEWAEHLT', produkt }).expect(200);
    expect(res.body.session.status).toBe('CHECKOUT');
    expect(res.body.session.positionen).toHaveLength(1);
    expect(res.body.session.positionen[0].rezept.patient.name).toBe('Max Mustermann');
    expect(res.body.session.positionen[0].rezept.krankenkasse.name).toBe('Techniker Krankenkasse');
    expect(res.body.session.ocrResult).toBeNull();

    // Ohne Termin ist die Bestellung noch nicht abschlussfähig.
    await request(app.getHttpServer())
      .post(`/api/v1/onboarding-sessions/${sessionId}/complete`)
      .set('Authorization', auth())
      .set('Idempotency-Key', nextIdempotencyKey())
      .expect(400);

    res = await patchEvent({ type: 'TERMIN_WAEHLEN' }).expect(200);
    expect(res.body.session.status).toBe('TERMINPLANUNG');
    const slot = { id: 'slot-1', beginn: '2026-08-01T09:00:00.000Z', ende: '2026-08-01T11:00:00.000Z', ort: 'Berlin' };
    await patchEvent({ type: 'TERMIN_VORSCHLAEGE_BERECHNET', vorschläge: [slot] }).expect(200);
    res = await patchEvent({ type: 'TERMIN_AUSGEWAEHLT', termin: slot }).expect(200);
    expect(res.body.session.status).toBe('CHECKOUT');

    res = await patchEvent({ type: 'KONTAKT_ERFASST', email: null, telefon: '+491511234567' }).expect(200);
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

  it('the created Supply has the full 5-event timeline, an open action, and is admin-visible', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/supplies/${supplyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.status).toBe('submitted');
    expect(res.body.timeline).toHaveLength(5);
    expect(res.body.openActions).toHaveLength(1);
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

  async function terminUndKontakt(patchEvent: (event: unknown, code?: string) => request.Test, telefon: string) {
    const slot = { id: 'slot-1', beginn: '2026-08-01T09:00:00.000Z', ende: '2026-08-01T11:00:00.000Z', ort: 'Berlin' };
    await patchEvent({ type: 'TERMIN_WAEHLEN' }).expect(200);
    await patchEvent({ type: 'TERMIN_AUSGEWAEHLT', termin: slot }).expect(200);
    const kontakt = await patchEvent({ type: 'KONTAKT_ERFASST', email: null, telefon }).expect(200);
    await patchEvent({ type: 'OTP_VERIFIZIERT' }, kontakt.body.devCode).expect(200);
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService);
    adminToken = await jwt.signAsync(
      { sub: 'test-admin', email: 'test-admin@example.com' },
      { secret: process.env.ADMIN_JWT_SECRET, expiresIn: '5m' },
    );
    const products = await request(app.getHttpServer()).get('/api/v1/products?limit=100').expect(200);
    type P = { id: string; hilfsmittelNr?: string; verfuegbar: boolean };
    kassenartikel = products.body.filter((p: P) => p.hilfsmittelNr && p.verfuegbar).slice(0, 2);
    selbstzahlerId = products.body.find((p: P) => !p.hilfsmittelNr && p.verfuegbar).id;
    nichtBestellbarId = products.body.find((p: P) => !p.verfuegbar).id;
    expect(kassenartikel).toHaveLength(2);
  });

  afterAll(async () => {
    await app.close();
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

  it('pflegt je Kassenartikel ein eigenes Rezept nach — die Krankenkassenkarte nur einmal', async () => {
    const { patchEvent, complete } = await neueSessionMitConsent();
    await patchEvent({ type: 'WARENKORB_UEBERNOMMEN', artikel: [{ produktId: kassenartikel[0].id, krankheitsbildId: 'mobilitaet' }, { produktId: kassenartikel[1].id }] }).expect(200);
    await terminUndKontakt(patchEvent, '+491511234569');

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
    await terminUndKontakt(patchEvent, '+491511234570');

    // Eine Bestellung mit Selbstzahler-Anteil schließt nur der verifizierte
    // Stripe-Webhook ab (siehe payment.e2e-spec.ts) — nie der Client.
    expect((await complete()).status).toBe(400);
    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth).expect(200);
    expect(current.body.status).toBe('CHECKOUT');
    expect(current.body.versorgungId).toBeNull();
  });

  it('kauft einen Kassenartikel ohne Rezept zum Selbstzahlerpreis — nur über die Zahlung abschließbar', async () => {
    const { patchEvent, complete, auth } = await neueSessionMitConsent();
    let res = await patchEvent(warenkorb(kassenartikel[0].id)).expect(200);
    const preis = res.body.session.positionen[0].produkt.selbstzahlerPreis;
    expect(preis).toBeGreaterThan(res.body.session.positionen[0].produkt.eigenanteil);
    await terminUndKontakt(patchEvent, '+491511234571');
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
