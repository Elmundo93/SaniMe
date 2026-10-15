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
  | { type: 'KATALOG_PRODUKT_VORGEMERKT'; produktId: string }
  | { type: 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT'; produkt: Produkt }
  | { type: 'ZURUECK_KATALOG' }
  | { type: 'KRANKHEITSBILD_STARTEN' }
  | { type: 'KRANKHEITSBILD_AUSGEWAEHLT'; krankheitsbildId: string; produkte: Produkt[] }
  | { type: 'KRANKHEITSBILD_PRODUKT_VORGEMERKT'; produktId: string }
  | { type: 'KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT'; produkt: Produkt }
  | { type: 'ZURUECK_KRANKHEITSBILD' }
  | { type: 'TERMIN_VORSCHLAEGE_BERECHNET'; vorschläge: TerminSlot[] }
  | { type: 'TERMIN_AUSGEWAEHLT'; termin: TerminSlot }
  | { type: 'AUFTRAG_BESTAETIGT' }
  | { type: 'KONTAKT_ERFASST'; email: string | null; telefon: string }
  | { type: 'OTP_VERIFIZIERT' }
  // Die beiden Abschluss-Events sind reine Server-Events (siehe
  // SERVER_EVENT_TYPES): ZAHLUNG_ERFOLGREICH löst nur der verifizierte
  // Stripe-Webhook aus, AUFTRAG_EINGEREICHT nur POST .../complete — und zwar
  // jeweils nur für den passenden Fall von zahlungBeimCheckoutFaellig().
  | { type: 'ZAHLUNG_ERFOLGREICH' }
  | { type: 'AUFTRAG_EINGEREICHT' }
  | { type: 'ZAHLUNG_FEHLGESCHLAGEN' }
  | { type: 'CHECKOUT_ERNEUT_VERSUCHEN' };

export const SERVER_EVENT_TYPES = ['ZAHLUNG_ERFOLGREICH', 'AUFTRAG_EINGEREICHT'] as const;

// Alles, was ein Client per PATCH schicken darf — die Abschluss-Events sind
// typseitig ausgeschlossen, damit kein Screen sie versehentlich dispatcht.
export type ClientOnboardingEvent = Exclude<OnboardingEvent, { type: (typeof SERVER_EVENT_TYPES)[number] }>;

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

export function consentErteilt(session: OnboardingSession): boolean {
  return session.consent.agb.akzeptiert && session.consent.datenschutz.akzeptiert;
}

// Ersetzt hatPflichtfelderKomplett als Abschluss-Guard: ein Selbstzahler-Produkt
// (keine Hilfsmittelnummer) hat legitim nie den Rezept-/Krankenkassen-OCR-Pfad
// durchlaufen, braucht die Rezept-Pflichtfelder also nie. Bewusst am
// gewählten Produkt festgemacht, nicht an eintrittspfad — eintrittspfad ist
// reine Navigations-Buchführung, keine Business-Regel.
export function istAbschlussfaehig(session: OnboardingSession): boolean {
  if (session.selectedSupply && !session.selectedSupply.hilfsmittelNr) return true;
  return hatPflichtfelderKomplett(session);
}

// Wird beim Checkout eine Zahlung fällig? Nur bei Selbstzahler-Artikeln mit
// Preis > 0 — das ist ein normaler Kauf. Bei GKV-Hilfsmitteln (mit
// Hilfsmittelnummer) zieht der Leistungserbringer die gesetzliche Zuzahlung
// erst nach Genehmigung/Lieferung ein (§ 43c SGB V); ihre Höhe hängt u.a. von
// Befreiung (§ 62 SGB V) und Alter ab, ist beim Bestellen also noch gar nicht
// sicher bekannt. Bewusst am Produkt festgemacht, nie an eintrittspfad.
export function zahlungBeimCheckoutFaellig(session: OnboardingSession): boolean {
  const produkt = session.selectedSupply;
  return Boolean(produkt && !produkt.hilfsmittelNr && produkt.eigenanteil > 0);
}

function abschlussMitZahlung(session: OnboardingSession): boolean {
  return telefonVerifiziert(session) && zahlungBeimCheckoutFaellig(session);
}

function abschlussOhneZahlung(session: OnboardingSession): boolean {
  return telefonVerifiziert(session) && !zahlungBeimCheckoutFaellig(session);
}

export const TRANSITIONS: TransitionRule<OnboardingStatus, OnboardingEvent, OnboardingSession>[] = [
  { from: 'WILLKOMMEN', event: 'WEITER', to: 'LEISTUNGSUEBERSICHT' },
  { from: 'LEISTUNGSUEBERSICHT', event: 'AGB_AKZEPTIERT', to: 'LEISTUNGSUEBERSICHT' },
  { from: 'LEISTUNGSUEBERSICHT', event: 'DATENSCHUTZ_AKZEPTIERT', to: 'LEISTUNGSUEBERSICHT' },
  {
    from: 'LEISTUNGSUEBERSICHT',
    event: 'WEITER',
    to: 'REZEPT_AUFNAHME',
    guard: consentErteilt,
  },
  {
    from: 'LEISTUNGSUEBERSICHT',
    event: 'KATALOG_PRODUKT_VORGEMERKT',
    to: 'REZEPT_AUFNAHME',
    guard: consentErteilt,
  },
  {
    from: 'LEISTUNGSUEBERSICHT',
    event: 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT',
    to: 'TERMINPLANUNG',
    guard: consentErteilt,
  },
  {
    from: 'LEISTUNGSUEBERSICHT',
    event: 'KRANKHEITSBILD_STARTEN',
    to: 'KRANKHEITSBILD_ERFASSUNG',
    guard: consentErteilt,
  },
  { from: 'KRANKHEITSBILD_ERFASSUNG', event: 'ZURUECK', to: 'LEISTUNGSUEBERSICHT' },
  { from: 'KRANKHEITSBILD_ERFASSUNG', event: 'KRANKHEITSBILD_AUSGEWAEHLT', to: 'KRANKHEITSBILD_EMPFEHLUNG' },
  { from: 'KRANKHEITSBILD_EMPFEHLUNG', event: 'ZURUECK', to: 'KRANKHEITSBILD_ERFASSUNG' },
  // Konsistent mit dem Katalog-Pfad: Konsens ist beim Erreichen von
  // KRANKHEITSBILD_EMPFEHLUNG bereits erteilt (einziger Weg dorthin führt
  // über den bereits konsens-geguardeten KRANKHEITSBILD_STARTEN), kein
  // weiterer Guard nötig.
  { from: 'KRANKHEITSBILD_EMPFEHLUNG', event: 'KRANKHEITSBILD_PRODUKT_VORGEMERKT', to: 'REZEPT_AUFNAHME' },
  { from: 'KRANKHEITSBILD_EMPFEHLUNG', event: 'KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT', to: 'TERMINPLANUNG' },
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
  // Eigenes Event statt ZURUECK wiederzuverwenden: der Selbstzahler-Katalogpfad
  // erreicht TERMINPLANUNG direkt aus LEISTUNGSUEBERSICHT, ohne je
  // VERSORGUNGSAUSWAHL zu besuchen — plain ZURUECK bliebe für diesen Pfad
  // ein Rücksprung ins Leere.
  { from: 'TERMINPLANUNG', event: 'ZURUECK_KATALOG', to: 'LEISTUNGSUEBERSICHT' },
  // Eigenes Event aus demselben Grund wie ZURUECK_KATALOG: der
  // Krankheitsbild-Selbstzahler-Pfad erreicht TERMINPLANUNG direkt aus
  // KRANKHEITSBILD_EMPFEHLUNG, nie über VERSORGUNGSAUSWAHL.
  { from: 'TERMINPLANUNG', event: 'ZURUECK_KRANKHEITSBILD', to: 'KRANKHEITSBILD_EMPFEHLUNG' },
  { from: 'ZUSAMMENFASSUNG', event: 'AUFTRAG_BESTAETIGT', to: 'CHECKOUT' },
  { from: 'ZUSAMMENFASSUNG', event: 'ZURUECK', to: 'TERMINPLANUNG' },
  { from: 'CHECKOUT', event: 'KONTAKT_ERFASST', to: 'CHECKOUT' },
  { from: 'CHECKOUT', event: 'OTP_VERIFIZIERT', to: 'CHECKOUT' },
  // Zwei getrennte Abschluss-Events statt eines mit Weiche im Guard — gleiche
  // Regel wie bei *_SELBSTZAHLER_GEWAEHLT: transition() nimmt nur die erste
  // passende Zeile, eine fachliche Gabelung muss also ein eigenes Event sein.
  {
    from: 'CHECKOUT',
    event: 'ZAHLUNG_ERFOLGREICH',
    to: 'ABGESCHLOSSEN',
    guard: abschlussMitZahlung,
  },
  {
    from: 'CHECKOUT',
    event: 'AUFTRAG_EINGEREICHT',
    to: 'ABGESCHLOSSEN',
    guard: abschlussOhneZahlung,
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
    case 'KATALOG_PRODUKT_VORGEMERKT':
      return { ...session, vorausgewaehltesProduktId: event.produktId };
    case 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT':
      return { ...session, selectedSupply: event.produkt, eintrittspfad: 'KATALOG_SELBSTZAHLER' };
    case 'ZURUECK_KATALOG':
      return session;
    case 'KRANKHEITSBILD_STARTEN':
      return session;
    case 'KRANKHEITSBILD_AUSGEWAEHLT':
      return {
        ...session,
        ausgewaehltesKrankheitsbildId: event.krankheitsbildId,
        verfügbareProdukte: event.produkte,
      };
    case 'KRANKHEITSBILD_PRODUKT_VORGEMERKT':
      return { ...session, vorausgewaehltesProduktId: event.produktId };
    case 'KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT':
      return { ...session, selectedSupply: event.produkt, eintrittspfad: 'KRANKHEITSBILD_SELBSTZAHLER' };
    case 'ZURUECK_KRANKHEITSBILD':
      return session;
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
    // versorgungId setzt der Server erst nach dem Anlegen der Versorgung
    // (OnboardingService.abschliessen), nicht dieses Event — so kann die
    // FSM-Prüfung vor dem Anlegen laufen.
    case 'ZAHLUNG_ERFOLGREICH':
    case 'AUFTRAG_EINGEREICHT':
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
    vorausgewaehltesProduktId: null,
    ausgewaehltesKrankheitsbildId: null,
    eintrittspfad: 'REZEPT',
    terminVorschläge: [],
    selectedAppointment: null,
    verbindlicheBestätigung: false,
    customerContact: { email: null, telefon: null, telefonVerifiziert: false },
    versorgungId: null,
  };
}
