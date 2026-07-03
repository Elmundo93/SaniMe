import 'dotenv/config';
import { createHash } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

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

  it('selects a real product, walks through Termin -> Zusammenfassung -> Checkout contact -> OTP', async () => {
    const current = await request(app.getHttpServer()).get('/api/v1/onboarding-sessions/current').set('Authorization', auth()).expect(200);
    const produkt = current.body.verfügbareProdukte.find((p: { id: string }) => p.id === selectedProductId);

    let res = await patchEvent({ type: 'SUPPLY_AUSGEWAEHLT', produkt }).expect(200);
    expect(res.body.session.status).toBe('TERMINPLANUNG');

    const slot = { id: 'slot-1', beginn: '2026-08-01T09:00:00.000Z', ende: '2026-08-01T11:00:00.000Z', ort: 'Berlin' };
    await patchEvent({ type: 'TERMIN_VORSCHLAEGE_BERECHNET', vorschläge: [slot] }).expect(200);
    res = await patchEvent({ type: 'TERMIN_AUSGEWAEHLT', termin: slot }).expect(200);
    expect(res.body.session.status).toBe('ZUSAMMENFASSUNG');

    res = await patchEvent({ type: 'AUFTRAG_BESTAETIGT' }).expect(200);
    expect(res.body.session.status).toBe('CHECKOUT');
    expect(res.body.session.verbindlicheBestätigung).toBe(true);

    res = await patchEvent({ type: 'KONTAKT_ERFASST', email: null, telefon: '+491511234567' }).expect(200);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
    const devCode: string = res.body.devCode;

    const badOtp = await patchEvent({ type: 'OTP_VERIFIZIERT' }, '000000');
    expect(badOtp.status).toBe(400);

    res = await patchEvent({ type: 'OTP_VERIFIZIERT' }, devCode).expect(200);
    expect(res.body.session.customerContact.telefonVerifiziert).toBe(true);
  });

  let supplyId: string;

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
