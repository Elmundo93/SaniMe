import { ERREICHBARKEITEN, NOTFALL_GRUENDE, type Erreichbarkeit, type NotfallGrund } from '@sanime/domain';
import { z } from 'zod';
import { WARENKORB_MAX } from '@sanime/domain';

// Mirrors @sanime/domain's OnboardingEvent discriminated union directly, so
// validation can't drift from the domain truth. The two completion events
// (ZAHLUNG_ERFOLGREICH, AUFTRAG_EINGEREICHT — @sanime/domain's
// SERVER_EVENT_TYPES) are deliberately excluded: completion only ever happens
// via POST .../complete or the verified Stripe webhook, never a client PATCH.
const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);

const ocrResultSchema = z.object({
  patient: z.object({
    name: z.string(),
    dateOfBirth: z.string(),
    adresse: z.object({ strasse: z.string(), plz: z.string(), ort: z.string() }).optional(),
  }),
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
  // Versionen sind nur die Behauptung des Clients — der Server ersetzt sie
  // durch die des geprüften Grants (OnboardingService.patchInner).
  z.object({
    type: z.literal('EINWILLIGUNG_UEBERNOMMEN'),
    einwilligungsToken: z.string().min(1).optional(),
    agbVersion: z.string().min(1),
    datenschutzVersion: z.string().min(1),
  }),
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
  // produkt is accepted but always re-fetched/re-validated server-side in
  // OnboardingService — "never trust the client's product data".
  z.object({ type: z.literal('SUPPLY_AUSGEWAEHLT'), produkt: produktSchema }),
  // Nur IDs zählen — `produkte` füllt der Server aus dem Katalog, was der
  // Client dort schickt, wird verworfen. krankheitsbildId: optionaler Kontext
  // aus der sessionlosen Discovery, muss eine bekannte Taxonomie-ID sein.
  z.object({
    type: z.literal('WARENKORB_UEBERNOMMEN'),
    artikel: z
      .array(z.object({ produktId: z.string().uuid(), krankheitsbildId: z.string().min(1).optional() }))
      .min(1)
      .max(WARENKORB_MAX),
    produkte: z.array(produktSchema).optional(),
  }),
  z.object({ type: z.literal('REZEPT_FUER_POSITION'), produktId: z.string().uuid() }),
  z.object({ type: z.literal('REZEPT_HINZUFUEGEN') }),
  z.object({ type: z.literal('REZEPT_BEARBEITEN'), produktId: z.string().uuid() }),
  z.object({ type: z.literal('WEITER_KRANKENKASSE_BEKANNT'), produkte: z.array(produktSchema).optional() }),
  z.object({ type: z.literal('REZEPT_ZUGEORDNET') }),
  z.object({ type: z.literal('POSITION_OHNE_REZEPT'), produktId: z.string().uuid(), ohneRezept: z.boolean() }),
  z.object({ type: z.literal('ZURUECK_CHECKOUT') }),
  z.object({ type: z.literal('ZURUECK_REZEPTPRUEFUNG') }),
  z.object({ type: z.literal('TERMIN_WAEHLEN') }),
  z.object({ type: z.literal('TERMIN_VORSCHLAEGE_BERECHNET'), vorschläge: z.array(terminSlotSchema) }),
  z.object({ type: z.literal('TERMIN_AUSGEWAEHLT'), termin: terminSlotSchema }),
  z.object({
    type: z.literal('NOTFALL_ANGEFRAGT'),
    notfall: z
      .object({
        grund: z.enum(Object.keys(NOTFALL_GRUENDE) as [NotfallGrund, ...NotfallGrund[]]),
        erreichbarkeit: z.enum(Object.keys(ERREICHBARKEITEN) as [Erreichbarkeit, ...Erreichbarkeit[]]),
        telefon: z.string().max(40).optional(),
      })
      .nullable(),
  }),
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
