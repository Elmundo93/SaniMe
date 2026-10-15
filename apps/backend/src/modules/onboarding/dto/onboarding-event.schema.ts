import { z } from 'zod';

// Mirrors @sanime/domain's OnboardingEvent discriminated union directly, so
// validation can't drift from the domain truth. The two completion events
// (ZAHLUNG_ERFOLGREICH, AUFTRAG_EINGEREICHT — @sanime/domain's
// SERVER_EVENT_TYPES) are deliberately excluded: completion only ever happens
// via POST .../complete or the verified Stripe webhook, never a client PATCH.
const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);

const ocrResultSchema = z.object({
  patient: z.object({ name: z.string(), dateOfBirth: z.string() }),
  arzt: z.object({ name: z.string(), lanr: z.string().optional() }),
  krankenkasse: z.object({ name: z.string(), ik: z.string().optional(), versichertenNr: z.string() }),
  diagnose: z.string(),
  hilfsmittel: z.string(),
  hilfsmittelNr: z.string().optional(),
  datum: z.string(),
});

const ocrConfidenceSchema = z.object({
  patient: confidenceLevelSchema,
  arzt: confidenceLevelSchema,
  krankenkasse: confidenceLevelSchema,
  diagnose: confidenceLevelSchema,
  hilfsmittel: confidenceLevelSchema,
});

const ocrKrankenkasseSchema = z.object({ name: z.string(), ik: z.string().optional(), versichertenNr: z.string() });

const produktSchema = z.object({
  id: z.string(),
  name: z.string(),
  hersteller: z.string(),
  hilfsmittelNr: z.string().optional(),
  beschreibung: z.string(),
  eigenanteil: z.number(),
  lieferzeit: z.string(),
  kategorie: z.string(),
  merkmale: z.array(z.string()),
});

const terminSlotSchema = z.object({
  id: z.string(),
  beginn: z.string(),
  ende: z.string(),
  ort: z.string(),
  hinweis: z.string().optional(),
});

export const onboardingEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('WEITER') }),
  z.object({ type: z.literal('ZURUECK') }),
  z.object({ type: z.literal('AGB_AKZEPTIERT'), version: z.string().min(1) }),
  z.object({ type: z.literal('DATENSCHUTZ_AKZEPTIERT'), version: z.string().min(1) }),
  z.object({
    type: z.literal('REZEPT_OCR_ABGESCHLOSSEN'),
    uri: z.string().min(1),
    result: ocrResultSchema,
    confidence: ocrConfidenceSchema,
  }),
  z.object({ type: z.literal('FELD_KORRIGIERT'), patch: ocrResultSchema.partial() }),
  z.object({
    type: z.literal('KRANKENKASSE_OCR_ABGESCHLOSSEN'),
    uri: z.string().min(1),
    krankenkasse: ocrKrankenkasseSchema,
    confidence: confidenceLevelSchema,
    // Ignored server-side even if sent — available products are always
    // computed by CatalogService, never trusted from the client.
    produkte: z.array(produktSchema).optional(),
  }),
  z.object({ type: z.literal('KRANKENKASSE_UEBERSPRUNGEN'), produkte: z.array(produktSchema).optional() }),
  z.object({ type: z.literal('SUPPLY_AUSGEWAEHLT'), produkt: produktSchema }),
  z.object({ type: z.literal('KATALOG_PRODUKT_VORGEMERKT'), produktId: z.string().min(1) }),
  // produkt is accepted but always re-fetched/re-validated server-side in
  // OnboardingService — same "never trust the client's product data" rule as
  // SUPPLY_AUSGEWAEHLT.
  z.object({ type: z.literal('KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT'), produkt: produktSchema }),
  z.object({ type: z.literal('ZURUECK_KATALOG') }),
  z.object({ type: z.literal('KRANKHEITSBILD_STARTEN') }),
  // krankheitsbildId is the only thing that matters — produkte, if the
  // client sends anything at all, is always discarded and recomputed
  // server-side (same discipline as KRANKENKASSE_OCR_ABGESCHLOSSEN).
  z.object({
    type: z.literal('KRANKHEITSBILD_AUSGEWAEHLT'),
    krankheitsbildId: z.string().min(1),
    produkte: z.array(produktSchema).optional(),
  }),
  z.object({ type: z.literal('KRANKHEITSBILD_PRODUKT_VORGEMERKT'), produktId: z.string().min(1) }),
  z.object({ type: z.literal('KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT'), produkt: produktSchema }),
  z.object({ type: z.literal('ZURUECK_KRANKHEITSBILD') }),
  z.object({ type: z.literal('TERMIN_VORSCHLAEGE_BERECHNET'), vorschläge: z.array(terminSlotSchema) }),
  z.object({ type: z.literal('TERMIN_AUSGEWAEHLT'), termin: terminSlotSchema }),
  z.object({ type: z.literal('AUFTRAG_BESTAETIGT') }),
  z.object({ type: z.literal('KONTAKT_ERFASST'), email: z.string().nullable(), telefon: z.string().min(1) }),
  z.object({ type: z.literal('OTP_VERIFIZIERT') }),
  z.object({ type: z.literal('ZAHLUNG_FEHLGESCHLAGEN') }),
  z.object({ type: z.literal('CHECKOUT_ERNEUT_VERSUCHEN') }),
]);

export const patchBodySchema = z.object({
  event: onboardingEventSchema,
  // Only required for the OTP_VERIFIZIERT event — verified server-side
  // against VerificationProvider before transition() ever runs, so a direct
  // PATCH can't fake phone verification the way today's 100%-client-mock
  // OTP hook would let it.
  code: z.string().optional(),
});
