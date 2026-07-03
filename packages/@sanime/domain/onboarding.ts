import type {
  ConfidenceLevel,
  OcrKrankenkasse,
  OcrResult,
  OcrConfidence,
  OnboardingSession,
  OnboardingStatus,
  Produkt,
  TerminSlot,
} from './types';
import { createWorkflow } from './workflow';
import type { TransitionRule } from './workflow';

export type OnboardingEvent =
  | { type: 'WEITER' }
  | { type: 'ZURUECK' }
  | { type: 'AGB_AKZEPTIERT'; version: string }
  | { type: 'DATENSCHUTZ_AKZEPTIERT'; version: string }
  | { type: 'REZEPT_OCR_ABGESCHLOSSEN'; uri: string; result: OcrResult; confidence: OcrConfidence }
  | { type: 'FELD_KORRIGIERT'; patch: Partial<OcrResult> }
  | {
      type: 'KRANKENKASSE_OCR_ABGESCHLOSSEN';
      uri: string;
      krankenkasse: OcrKrankenkasse;
      confidence: ConfidenceLevel;
      produkte: Produkt[];
    }
  | { type: 'KRANKENKASSE_UEBERSPRUNGEN'; produkte: Produkt[] }
  | { type: 'SUPPLY_AUSGEWAEHLT'; produkt: Produkt }
  | { type: 'TERMIN_VORSCHLAEGE_BERECHNET'; vorschläge: TerminSlot[] }
  | { type: 'TERMIN_AUSGEWAEHLT'; termin: TerminSlot }
  | { type: 'AUFTRAG_BESTAETIGT' }
  | { type: 'KONTAKT_ERFASST'; email: string | null; telefon: string }
  | { type: 'OTP_VERIFIZIERT' }
  | { type: 'ZAHLUNG_ERFOLGREICH'; versorgungId: string }
  | { type: 'ZAHLUNG_FEHLGESCHLAGEN' }
  | { type: 'CHECKOUT_ERNEUT_VERSUCHEN' };

export type TransitionResult =
  | { ok: true; session: OnboardingSession }
  | { ok: false; reason: string };

export function hatPflichtfelderRezept(session: OnboardingSession): boolean {
  const ocr = session.ocrResult;
  if (!ocr) return false;
  return Boolean(ocr.patient.name && ocr.arzt.name && ocr.diagnose && ocr.hilfsmittel);
}

export function hatPflichtfelderKomplett(session: OnboardingSession): boolean {
  const ocr = session.ocrResult;
  if (!ocr) return false;
  return Boolean(
    ocr.patient.name &&
    ocr.krankenkasse.name &&
    ocr.krankenkasse.versichertenNr &&
    ocr.hilfsmittel,
  );
}

export function telefonVerifiziert(session: OnboardingSession): boolean {
  return session.customerContact.telefonVerifiziert || !session.customerContact.telefon;
}

export const TRANSITIONS: TransitionRule<OnboardingStatus, OnboardingEvent, OnboardingSession>[] = [
  { from: 'WILLKOMMEN', event: 'WEITER', to: 'LEISTUNGSUEBERSICHT' },
  { from: 'LEISTUNGSUEBERSICHT', event: 'AGB_AKZEPTIERT', to: 'LEISTUNGSUEBERSICHT' },
  { from: 'LEISTUNGSUEBERSICHT', event: 'DATENSCHUTZ_AKZEPTIERT', to: 'LEISTUNGSUEBERSICHT' },
  {
    from: 'LEISTUNGSUEBERSICHT',
    event: 'WEITER',
    to: 'REZEPT_AUFNAHME',
    guard: (s) => s.consent.agb.akzeptiert && s.consent.datenschutz.akzeptiert,
  },
  { from: 'REZEPT_AUFNAHME', event: 'REZEPT_OCR_ABGESCHLOSSEN', to: 'REZEPT_PRUEFUNG' },
  { from: 'REZEPT_AUFNAHME', event: 'ZURUECK', to: 'LEISTUNGSUEBERSICHT' },
  { from: 'REZEPT_PRUEFUNG', event: 'FELD_KORRIGIERT', to: 'REZEPT_PRUEFUNG' },
  {
    from: 'REZEPT_PRUEFUNG',
    event: 'WEITER',
    to: 'KRANKENKASSE_AUFNAHME',
    guard: hatPflichtfelderRezept,
  },
  { from: 'REZEPT_PRUEFUNG', event: 'ZURUECK', to: 'REZEPT_AUFNAHME' },
  { from: 'KRANKENKASSE_AUFNAHME', event: 'KRANKENKASSE_OCR_ABGESCHLOSSEN', to: 'DATENPRUEFUNG' },
  { from: 'KRANKENKASSE_AUFNAHME', event: 'KRANKENKASSE_UEBERSPRUNGEN', to: 'DATENPRUEFUNG' },
  { from: 'KRANKENKASSE_AUFNAHME', event: 'ZURUECK', to: 'REZEPT_PRUEFUNG' },
  { from: 'DATENPRUEFUNG', event: 'FELD_KORRIGIERT', to: 'DATENPRUEFUNG' },
  {
    from: 'DATENPRUEFUNG',
    event: 'WEITER',
    to: 'VERSORGUNGSAUSWAHL',
    guard: hatPflichtfelderKomplett,
  },
  { from: 'DATENPRUEFUNG', event: 'ZURUECK', to: 'KRANKENKASSE_AUFNAHME' },
  { from: 'VERSORGUNGSAUSWAHL', event: 'SUPPLY_AUSGEWAEHLT', to: 'TERMINPLANUNG' },
  { from: 'VERSORGUNGSAUSWAHL', event: 'ZURUECK', to: 'DATENPRUEFUNG' },
  { from: 'TERMINPLANUNG', event: 'TERMIN_VORSCHLAEGE_BERECHNET', to: 'TERMINPLANUNG' },
  { from: 'TERMINPLANUNG', event: 'TERMIN_AUSGEWAEHLT', to: 'ZUSAMMENFASSUNG' },
  { from: 'TERMINPLANUNG', event: 'ZURUECK', to: 'VERSORGUNGSAUSWAHL' },
  { from: 'ZUSAMMENFASSUNG', event: 'AUFTRAG_BESTAETIGT', to: 'CHECKOUT' },
  { from: 'ZUSAMMENFASSUNG', event: 'ZURUECK', to: 'TERMINPLANUNG' },
  { from: 'CHECKOUT', event: 'KONTAKT_ERFASST', to: 'CHECKOUT' },
  { from: 'CHECKOUT', event: 'OTP_VERIFIZIERT', to: 'CHECKOUT' },
  {
    from: 'CHECKOUT',
    event: 'ZAHLUNG_ERFOLGREICH',
    to: 'ABGESCHLOSSEN',
    guard: telefonVerifiziert,
  },
  { from: 'CHECKOUT', event: 'ZAHLUNG_FEHLGESCHLAGEN', to: 'CHECKOUT_FEHLGESCHLAGEN' },
  { from: 'CHECKOUT_FEHLGESCHLAGEN', event: 'CHECKOUT_ERNEUT_VERSUCHEN', to: 'CHECKOUT' },
];

function applyEventData(session: OnboardingSession, event: OnboardingEvent): OnboardingSession {
  switch (event.type) {
    case 'WEITER':
    case 'ZURUECK':
      return session;
    case 'AGB_AKZEPTIERT':
      return {
        ...session,
        consent: {
          ...session.consent,
          agb: { akzeptiert: true, version: event.version, zeitpunkt: new Date().toISOString() },
        },
      };
    case 'DATENSCHUTZ_AKZEPTIERT':
      return {
        ...session,
        consent: {
          ...session.consent,
          datenschutz: { akzeptiert: true, version: event.version, zeitpunkt: new Date().toISOString() },
        },
      };
    case 'REZEPT_OCR_ABGESCHLOSSEN':
      return {
        ...session,
        rezeptFotoUri: event.uri,
        ocrResult: event.result,
        ocrConfidence: event.confidence,
      };
    case 'FELD_KORRIGIERT':
      return {
        ...session,
        ocrResult: session.ocrResult ? { ...session.ocrResult, ...event.patch } : session.ocrResult,
        ocrBearbeitet: true,
      };
    case 'KRANKENKASSE_OCR_ABGESCHLOSSEN':
      return {
        ...session,
        krankenkasseFotoUri: event.uri,
        krankenkasseUebersprungen: false,
        ocrResult: session.ocrResult ? { ...session.ocrResult, krankenkasse: event.krankenkasse } : session.ocrResult,
        ocrConfidence: session.ocrConfidence
          ? { ...session.ocrConfidence, krankenkasse: event.confidence }
          : session.ocrConfidence,
        verfügbareProdukte: event.produkte,
      };
    case 'KRANKENKASSE_UEBERSPRUNGEN':
      return { ...session, krankenkasseUebersprungen: true, verfügbareProdukte: event.produkte };
    case 'SUPPLY_AUSGEWAEHLT':
      return { ...session, selectedSupply: event.produkt };
    case 'TERMIN_VORSCHLAEGE_BERECHNET':
      return { ...session, terminVorschläge: event.vorschläge };
    case 'TERMIN_AUSGEWAEHLT':
      return { ...session, selectedAppointment: event.termin };
    case 'AUFTRAG_BESTAETIGT':
      return { ...session, verbindlicheBestätigung: true };
    case 'KONTAKT_ERFASST':
      return {
        ...session,
        customerContact: { ...session.customerContact, email: event.email, telefon: event.telefon },
      };
    case 'OTP_VERIFIZIERT':
      return {
        ...session,
        customerContact: { ...session.customerContact, telefonVerifiziert: true },
      };
    case 'ZAHLUNG_ERFOLGREICH':
      return { ...session, versorgungId: event.versorgungId };
    case 'ZAHLUNG_FEHLGESCHLAGEN':
    case 'CHECKOUT_ERNEUT_VERSUCHEN':
      return session;
  }
}

export const OnboardingWorkflow = createWorkflow<OnboardingStatus, OnboardingEvent, OnboardingSession>(
  TRANSITIONS,
  (session, event) => ({ ...applyEventData(session, event), aktualisiert: new Date().toISOString() }),
);

export function transition(session: OnboardingSession, event: OnboardingEvent): TransitionResult {
  const result = OnboardingWorkflow.transition(session, event);
  return result.ok ? { ok: true, session: result.context } : result;
}

export function erstelleLeereSession(id: string): OnboardingSession {
  const now = new Date().toISOString();
  return {
    id,
    status: 'WILLKOMMEN',
    erstellt: now,
    aktualisiert: now,
    completedAt: null,
    consent: {
      agb: { akzeptiert: false, version: '', zeitpunkt: null },
      datenschutz: { akzeptiert: false, version: '', zeitpunkt: null },
    },
    rezeptFotoUri: null,
    krankenkasseFotoUri: null,
    krankenkasseUebersprungen: false,
    ocrResult: null,
    ocrConfidence: null,
    ocrBearbeitet: false,
    verfügbareProdukte: [],
    selectedSupply: null,
    terminVorschläge: [],
    selectedAppointment: null,
    verbindlicheBestätigung: false,
    customerContact: { email: null, telefon: null, telefonVerifiziert: false },
    versorgungId: null,
  };
}
