import type {
  ConfidenceLevel,
  OcrKrankenkasse,
  OcrResult,
  OcrConfidence,
  OnboardingSession,
  OnboardingStatus,
  Produkt,
  TerminSlot,
  WarenkorbPosition,
} from './types';
import { einwilligungAktuell } from './einwilligung';
import { createWorkflow } from './workflow';
import type { TransitionRule } from './workflow';

export type OnboardingEvent =
  | { type: 'WEITER' }
  | { type: 'ZURUECK' }
  | { type: 'AGB_AKZEPTIERT'; version: string }
  | { type: 'DATENSCHUTZ_AKZEPTIERT'; version: string }
  // Übernimmt eine früher erteilte, noch aktuelle Einwilligung (consent_grants)
  // für eine neue Session. Der Client setzt die Versionen auf die aktuellen
  // Konstanten; der Server prüft den Grant und überschreibt sie mit den
  // tatsächlich erteilten — der Client behauptet nur, der Server entscheidet.
  | { type: 'EINWILLIGUNG_UEBERNOMMEN'; einwilligungsToken?: string; agbVersion: string; datenschutzVersion: string }
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
  // Rezept-zuerst: das auf dem Rezept passende Produkt wird zur Position (mit
  // dem eben erfassten Rezept).
  | { type: 'SUPPLY_AUSGEWAEHLT'; produkt: Produkt }
  // Übernimmt den (lokal auf dem Gerät geführten) Warenkorb in die Bestellung —
  // gleicht die Positionen ab: bestehende behalten ihr Rezept, fehlende fallen
  // weg, neue kommen hinzu. `produkte` füllt ausschließlich der Server (aus dem
  // Katalog, in der Reihenfolge von `artikel`); ein Client schickt []. 
  // krankheitsbildId: optionaler Kontext aus der sessionlosen Discovery.
  | { type: 'WARENKORB_UEBERNOMMEN'; artikel: WarenkorbArtikel[]; produkte: Produkt[] }
  // Speichen des Checkouts — jede führt zurück auf CHECKOUT.
  | { type: 'REZEPT_FUER_POSITION'; produktId: string }
  | { type: 'REZEPT_HINZUFUEGEN' }
  | { type: 'REZEPT_BEARBEITEN'; produktId: string }
  | { type: 'WEITER_KRANKENKASSE_BEKANNT' }
  | { type: 'REZEPT_ZUGEORDNET' }
  // Kassenartikel ohne Rezept zum Selbstzahlerpreis kaufen (bzw. zurück).
  | { type: 'POSITION_OHNE_REZEPT'; produktId: string; ohneRezept: boolean }
  | { type: 'ZURUECK_CHECKOUT' }
  | { type: 'TERMIN_WAEHLEN' }
  | { type: 'TERMIN_VORSCHLAEGE_BERECHNET'; vorschläge: TerminSlot[] }
  | { type: 'TERMIN_AUSGEWAEHLT'; termin: TerminSlot }
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

export interface WarenkorbArtikel {
  produktId: string;
  krankheitsbildId?: string;
}

// SecureStore-Werte sind auf Android auf ~2 KB begrenzt — der lokale Warenkorb
// (Produkt-IDs + optionaler Kontext) bleibt mit 20 Einträgen sicher darunter.
export const WARENKORB_MAX = 20;

export type TransitionResult =
  | { ok: true; session: OnboardingSession }
  | { ok: false; reason: string };

export function hatPflichtfelderRezept(session: OnboardingSession): boolean {
  const ocr = session.ocrResult;
  if (!ocr) return false;
  return Boolean(ocr.patient.name && ocr.arzt.name && ocr.diagnose && ocr.hilfsmittel);
}

// Ein Rezept ist vollständig für die Einreichung bei der Krankenkasse.
export function rezeptVollstaendig(rezept: OcrResult | null): boolean {
  if (!rezept) return false;
  return Boolean(
    rezept.patient.name &&
    rezept.krankenkasse.name &&
    rezept.krankenkasse.versichertenNr &&
    rezept.hilfsmittel,
  );
}

// Der laufende Scan (session.ocrResult) ist vollständig — Guard der Datenprüfung.
export function hatPflichtfelderKomplett(session: OnboardingSession): boolean {
  return rezeptVollstaendig(session.ocrResult);
}

export function istKassenartikel(produkt: Produkt): boolean {
  return Boolean(produkt.hilfsmittelNr);
}

// Ein Kassenartikel geht mit Rezept an die Krankenkasse — außer der Kunde kauft
// ihn bewusst ohne Rezept zum Selbstzahlerpreis.
export function wirdEingereicht(position: WarenkorbPosition): boolean {
  return istKassenartikel(position.produkt) && !position.ohneRezept;
}

// Was der Kunde für diese Position beim Checkout selbst zahlt (Euro).
export function preisBeimCheckoutEuro(position: WarenkorbPosition): number {
  if (!istKassenartikel(position.produkt)) return position.produkt.eigenanteil;
  return position.ohneRezept ? (position.produkt.selbstzahlerPreis ?? 0) : 0;
}

// Kassenartikel, für die noch ein (vollständiges) Rezept fehlt — der Checkout
// zeigt sie als offene Aufgabe (Rezept fotografieren oder ohne Rezept kaufen),
// die Einreichung ist bis dahin gesperrt.
export function positionenOhneRezept(session: OnboardingSession): WarenkorbPosition[] {
  return session.positionen.filter((p) => wirdEingereicht(p) && !rezeptVollstaendig(p.rezept));
}

export function findePosition(session: OnboardingSession, produktId: string | null): WarenkorbPosition | undefined {
  return produktId ? session.positionen.find((p) => p.produkt.id === produktId) : undefined;
}

export function telefonVerifiziert(session: OnboardingSession): boolean {
  return session.customerContact.telefonVerifiziert || !session.customerContact.telefon;
}

export function consentErteilt(session: OnboardingSession): boolean {
  return session.consent.agb.akzeptiert && session.consent.datenschutz.akzeptiert;
}

// Abschluss-Guard: mindestens eine Position, ein Termin, und jeder Kassenartikel
// hat ein vollständiges Rezept. Selbstzahler-Artikel brauchen nie eines — am
// Produkt festgemacht (hilfsmittelNr), nie an einem Eintrittspfad.
export function istAbschlussfaehig(session: OnboardingSession): boolean {
  return (
    session.positionen.length > 0 &&
    session.selectedAppointment !== null &&
    positionenOhneRezept(session).length === 0
  );
}

// Was beim Checkout zu bezahlen ist: die Summe der Selbstzahler-Artikel. Bei
// GKV-Hilfsmitteln (mit Hilfsmittelnummer) zieht der Leistungserbringer die
// gesetzliche Zuzahlung erst nach Genehmigung/Lieferung ein (§ 43c SGB V); ihre
// Höhe hängt u.a. von Befreiung (§ 62 SGB V) und Alter ab, ist beim Bestellen
// also noch gar nicht sicher bekannt. Nur für die Anzeige — den echten Betrag
// rechnet der Server aus den Katalog-Angeboten (Cent).
export function betragBeimCheckoutEuro(session: OnboardingSession): number {
  return session.positionen.reduce((summe, p) => summe + preisBeimCheckoutEuro(p), 0);
}

// Voraussichtliche gesetzliche Zuzahlung aller Kassenartikel — wird später
// abgerechnet, nie beim Checkout.
export function voraussichtlicheZuzahlungEuro(session: OnboardingSession): number {
  return session.positionen.filter(wirdEingereicht).reduce((summe, p) => summe + p.produkt.eigenanteil, 0);
}

export function zahlungBeimCheckoutFaellig(session: OnboardingSession): boolean {
  return betragBeimCheckoutEuro(session) > 0;
}

function abschlussMitZahlung(session: OnboardingSession): boolean {
  return telefonVerifiziert(session) && zahlungBeimCheckoutFaellig(session);
}

function abschlussOhneZahlung(session: OnboardingSession): boolean {
  return telefonVerifiziert(session) && !zahlungBeimCheckoutFaellig(session);
}

function uebernahmeAktuell(_session: OnboardingSession, event: OnboardingEvent): boolean {
  return event.type === 'EINWILLIGUNG_UEBERNOMMEN' && einwilligungAktuell(event);
}

function warenkorbGueltig(_session: OnboardingSession, event: OnboardingEvent): boolean {
  if (event.type !== 'WARENKORB_UEBERNOMMEN') return false;
  const ids = event.artikel.map((a) => a.produktId);
  return ids.length > 0 && ids.length <= WARENKORB_MAX && new Set(ids).size === ids.length;
}

function hatPositionen(session: OnboardingSession): boolean {
  return session.positionen.length > 0;
}

function ohneAktivePosition(session: OnboardingSession): boolean {
  return session.aktivePositionId === null;
}

function kassenPositionAusEvent(session: OnboardingSession, event: OnboardingEvent): boolean {
  if (event.type !== 'REZEPT_FUER_POSITION' && event.type !== 'REZEPT_BEARBEITEN') return false;
  const position = findePosition(session, event.produktId);
  if (!position || !istKassenartikel(position.produkt)) return false;
  return event.type === 'REZEPT_FUER_POSITION' || position.rezept !== null;
}

function ohneRezeptMoeglich(session: OnboardingSession, event: OnboardingEvent): boolean {
  if (event.type !== 'POSITION_OHNE_REZEPT') return false;
  const position = findePosition(session, event.produktId);
  if (!position || !istKassenartikel(position.produkt)) return false;
  return !event.ohneRezept || position.produkt.selbstzahlerPreis !== undefined;
}

function rezeptZuordenbar(session: OnboardingSession): boolean {
  return findePosition(session, session.aktivePositionId) !== undefined && hatPflichtfelderKomplett(session);
}

// Zurück aus der Datenprüfung direkt in den Checkout nur beim Bearbeiten eines
// schon zugeordneten Rezepts — ein neuer Scan geht den normalen Weg zurück.
function bearbeitetZugeordnetesRezept(session: OnboardingSession): boolean {
  return findePosition(session, session.aktivePositionId)?.rezept != null;
}

function kassenartikelMitRezept(session: OnboardingSession, event: OnboardingEvent): boolean {
  if (event.type !== 'SUPPLY_AUSGEWAEHLT') return false;
  const neu = !findePosition(session, event.produkt.id);
  return (
    istKassenartikel(event.produkt) &&
    hatPflichtfelderKomplett(session) &&
    (!neu || session.positionen.length < WARENKORB_MAX)
  );
}

// Der Checkout ist die Nabe: der Warenkorb (bzw. ein Rezept-zuerst gewähltes
// Produkt) landet dort, und Rezept-Scan und Terminwahl sind Speichen, die
// jeweils wieder auf CHECKOUT zurückführen.
export const TRANSITIONS: TransitionRule<OnboardingStatus, OnboardingEvent, OnboardingSession>[] = [
  { from: 'WILLKOMMEN', event: 'WEITER', to: 'LEISTUNGSUEBERSICHT' },
  // Dauerhafte Einwilligung: überspringt das erneute Abfragen. Ziel ist
  // LEISTUNGSUEBERSICHT mit erteilter Einwilligung — von dort greift sofort
  // WEITER bzw. das vorgemerkte WARENKORB_UEBERNOMMEN.
  { from: 'WILLKOMMEN', event: 'EINWILLIGUNG_UEBERNOMMEN', to: 'LEISTUNGSUEBERSICHT', guard: uebernahmeAktuell },
  { from: 'LEISTUNGSUEBERSICHT', event: 'AGB_AKZEPTIERT', to: 'LEISTUNGSUEBERSICHT' },
  { from: 'LEISTUNGSUEBERSICHT', event: 'DATENSCHUTZ_AKZEPTIERT', to: 'LEISTUNGSUEBERSICHT' },
  { from: 'LEISTUNGSUEBERSICHT', event: 'WEITER', to: 'REZEPT_AUFNAHME', guard: consentErteilt },
  {
    from: 'LEISTUNGSUEBERSICHT',
    event: 'WARENKORB_UEBERNOMMEN',
    to: 'CHECKOUT',
    guard: (s, e) => consentErteilt(s) && warenkorbGueltig(s, e),
  },

  // Rezept-Scan — Rezept-zuerst (aktivePositionId null) oder für eine Position.
  { from: 'REZEPT_AUFNAHME', event: 'REZEPT_OCR_ABGESCHLOSSEN', to: 'REZEPT_PRUEFUNG' },
  {
    from: 'REZEPT_AUFNAHME',
    event: 'ZURUECK',
    to: 'LEISTUNGSUEBERSICHT',
    guard: (s) => !hatPositionen(s) && ohneAktivePosition(s),
  },
  { from: 'REZEPT_AUFNAHME', event: 'ZURUECK_CHECKOUT', to: 'CHECKOUT', guard: hatPositionen },
  { from: 'REZEPT_PRUEFUNG', event: 'FELD_KORRIGIERT', to: 'REZEPT_PRUEFUNG' },
  { from: 'REZEPT_PRUEFUNG', event: 'WEITER', to: 'KRANKENKASSE_AUFNAHME', guard: hatPflichtfelderRezept },
  // Krankenkasse ist schon aus einem früheren Rezept dieser Bestellung bekannt —
  // die Karte muss nicht noch einmal fotografiert werden.
  {
    from: 'REZEPT_PRUEFUNG',
    event: 'WEITER_KRANKENKASSE_BEKANNT',
    to: 'DATENPRUEFUNG',
    guard: (s) => hatPflichtfelderRezept(s) && s.krankenkasse !== null,
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
    guard: (s) => ohneAktivePosition(s) && hatPflichtfelderKomplett(s),
  },
  { from: 'DATENPRUEFUNG', event: 'REZEPT_ZUGEORDNET', to: 'CHECKOUT', guard: rezeptZuordenbar },
  { from: 'DATENPRUEFUNG', event: 'ZURUECK_CHECKOUT', to: 'CHECKOUT', guard: bearbeitetZugeordnetesRezept },
  { from: 'DATENPRUEFUNG', event: 'ZURUECK', to: 'KRANKENKASSE_AUFNAHME' },
  { from: 'VERSORGUNGSAUSWAHL', event: 'SUPPLY_AUSGEWAEHLT', to: 'CHECKOUT', guard: kassenartikelMitRezept },
  { from: 'VERSORGUNGSAUSWAHL', event: 'ZURUECK', to: 'DATENPRUEFUNG' },

  // Checkout-Nabe und ihre Speichen.
  { from: 'CHECKOUT', event: 'WARENKORB_UEBERNOMMEN', to: 'CHECKOUT', guard: warenkorbGueltig },
  { from: 'CHECKOUT', event: 'REZEPT_FUER_POSITION', to: 'REZEPT_AUFNAHME', guard: kassenPositionAusEvent },
  { from: 'CHECKOUT', event: 'REZEPT_HINZUFUEGEN', to: 'REZEPT_AUFNAHME' },
  { from: 'CHECKOUT', event: 'REZEPT_BEARBEITEN', to: 'DATENPRUEFUNG', guard: kassenPositionAusEvent },
  { from: 'CHECKOUT', event: 'POSITION_OHNE_REZEPT', to: 'CHECKOUT', guard: ohneRezeptMoeglich },
  { from: 'CHECKOUT_FEHLGESCHLAGEN', event: 'POSITION_OHNE_REZEPT', to: 'CHECKOUT', guard: ohneRezeptMoeglich },
  { from: 'CHECKOUT', event: 'TERMIN_WAEHLEN', to: 'TERMINPLANUNG', guard: hatPositionen },
  { from: 'TERMINPLANUNG', event: 'TERMIN_VORSCHLAEGE_BERECHNET', to: 'TERMINPLANUNG' },
  { from: 'TERMINPLANUNG', event: 'TERMIN_AUSGEWAEHLT', to: 'CHECKOUT' },
  { from: 'TERMINPLANUNG', event: 'ZURUECK', to: 'CHECKOUT' },
  { from: 'CHECKOUT', event: 'KONTAKT_ERFASST', to: 'CHECKOUT' },
  { from: 'CHECKOUT', event: 'OTP_VERIFIZIERT', to: 'CHECKOUT' },
  // Zwei getrennte Abschluss-Events statt eines mit Weiche im Guard —
  // transition() nimmt nur die erste passende Zeile, eine fachliche Gabelung
  // muss also ein eigenes Event sein.
  {
    from: 'CHECKOUT',
    event: 'ZAHLUNG_ERFOLGREICH',
    to: 'ABGESCHLOSSEN',
    guard: (s) => istAbschlussfaehig(s) && abschlussMitZahlung(s),
  },
  {
    from: 'CHECKOUT',
    event: 'AUFTRAG_EINGEREICHT',
    to: 'ABGESCHLOSSEN',
    guard: (s) => istAbschlussfaehig(s) && abschlussOhneZahlung(s),
  },
  { from: 'CHECKOUT', event: 'ZAHLUNG_FEHLGESCHLAGEN', to: 'CHECKOUT_FEHLGESCHLAGEN' },
  { from: 'CHECKOUT_FEHLGESCHLAGEN', event: 'CHECKOUT_ERNEUT_VERSUCHEN', to: 'CHECKOUT' },
  { from: 'CHECKOUT_FEHLGESCHLAGEN', event: 'WARENKORB_UEBERNOMMEN', to: 'CHECKOUT', guard: warenkorbGueltig },
];

// Ein Rezept trägt immer die Krankenkasse der Session (so wie der Server es
// aus insurance_policies zusammensetzt).
function mitKrankenkasse(rezept: OcrResult | null, krankenkasse: OcrKrankenkasse | null): OcrResult | null {
  return rezept && krankenkasse ? { ...rezept, krankenkasse } : rezept;
}

function setzeKrankenkasse(session: OnboardingSession, krankenkasse: OcrKrankenkasse): OnboardingSession {
  return {
    ...session,
    krankenkasse,
    ocrResult: mitKrankenkasse(session.ocrResult, krankenkasse),
    positionen: session.positionen.map((p) => ({ ...p, rezept: mitKrankenkasse(p.rezept, krankenkasse) })),
  };
}

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
    case 'EINWILLIGUNG_UEBERNOMMEN': {
      const zeitpunkt = new Date().toISOString();
      return {
        ...session,
        consent: {
          agb: { akzeptiert: true, version: event.agbVersion, zeitpunkt },
          datenschutz: { akzeptiert: true, version: event.datenschutzVersion, zeitpunkt },
        },
      };
    }
    case 'REZEPT_OCR_ABGESCHLOSSEN':
      return {
        ...session,
        rezeptFotoUri: event.uri,
        ocrResult: mitKrankenkasse(event.result, session.krankenkasse),
        ocrConfidence: event.confidence,
        ocrBearbeitet: false,
      };
    case 'FELD_KORRIGIERT': {
      const korrigiert: OnboardingSession = {
        ...session,
        ocrResult: session.ocrResult ? { ...session.ocrResult, ...event.patch } : session.ocrResult,
        ocrBearbeitet: true,
      };
      const kk = event.patch.krankenkasse;
      return kk ? setzeKrankenkasse(korrigiert, { ...(session.krankenkasse ?? { name: '', versichertenNr: '' }), ...kk }) : korrigiert;
    }
    case 'KRANKENKASSE_OCR_ABGESCHLOSSEN':
      return {
        ...setzeKrankenkasse(session, event.krankenkasse),
        krankenkasseFotoUri: event.uri,
        krankenkasseUebersprungen: false,
        ocrConfidence: session.ocrConfidence
          ? { ...session.ocrConfidence, krankenkasse: event.confidence }
          : session.ocrConfidence,
        verfügbareProdukte: event.produkte,
      };
    case 'KRANKENKASSE_UEBERSPRUNGEN':
      return { ...session, krankenkasseUebersprungen: true, verfügbareProdukte: event.produkte };
    case 'SUPPLY_AUSGEWAEHLT': {
      const position: WarenkorbPosition = {
        produkt: event.produkt,
        rezept: session.ocrResult,
        rezeptConfidence: session.ocrConfidence,
        ohneRezept: false,
        krankheitsbildId: findePosition(session, event.produkt.id)?.krankheitsbildId ?? null,
      };
      const vorhanden = findePosition(session, event.produkt.id) !== undefined;
      return {
        ...session,
        positionen: vorhanden
          ? session.positionen.map((p) => (p.produkt.id === event.produkt.id ? position : p))
          : [...session.positionen, position],
        ocrResult: null,
        ocrConfidence: null,
      };
    }
    case 'WARENKORB_UEBERNOMMEN':
      return {
        ...session,
        positionen: event.produkte.map((produkt) => {
          const bestehend = findePosition(session, produkt.id);
          const kontext = event.artikel.find((a) => a.produktId === produkt.id)?.krankheitsbildId;
          return bestehend
            ? { ...bestehend, produkt, krankheitsbildId: kontext ?? bestehend.krankheitsbildId }
            : { produkt, rezept: null, rezeptConfidence: null, ohneRezept: false, krankheitsbildId: kontext ?? null };
        }),
      };
    case 'REZEPT_FUER_POSITION':
      return { ...session, aktivePositionId: event.produktId, ocrResult: null, ocrConfidence: null };
    case 'REZEPT_HINZUFUEGEN':
      return { ...session, aktivePositionId: null, ocrResult: null, ocrConfidence: null };
    case 'REZEPT_BEARBEITEN': {
      const position = findePosition(session, event.produktId);
      return {
        ...session,
        aktivePositionId: event.produktId,
        ocrResult: position?.rezept ?? null,
        ocrConfidence: position?.rezeptConfidence ?? null,
      };
    }
    case 'WEITER_KRANKENKASSE_BEKANNT':
      return session;
    case 'REZEPT_ZUGEORDNET':
      return {
        ...session,
        positionen: session.positionen.map((p) =>
          p.produkt.id === session.aktivePositionId
            ? { ...p, rezept: session.ocrResult, rezeptConfidence: session.ocrConfidence, ohneRezept: false }
            : p,
        ),
        aktivePositionId: null,
        ocrResult: null,
        ocrConfidence: null,
      };
    case 'POSITION_OHNE_REZEPT':
      return {
        ...session,
        positionen: session.positionen.map((p) =>
          p.produkt.id === event.produktId ? { ...p, ohneRezept: event.ohneRezept } : p,
        ),
      };
    case 'ZURUECK_CHECKOUT':
      return { ...session, aktivePositionId: null, ocrResult: null, ocrConfidence: null };
    // Vorschläge neu berechnen lassen — der Warenkorb kann sich seit dem
    // letzten Öffnen geändert haben.
    case 'TERMIN_WAEHLEN':
      return { ...session, terminVorschläge: [] };
    case 'TERMIN_VORSCHLAEGE_BERECHNET':
      return { ...session, terminVorschläge: event.vorschläge };
    case 'TERMIN_AUSGEWAEHLT':
      return { ...session, selectedAppointment: event.termin };
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
    krankenkasse: null,
    verfügbareProdukte: [],
    positionen: [],
    aktivePositionId: null,
    terminVorschläge: [],
    selectedAppointment: null,
    customerContact: { email: null, telefon: null, telefonVerifiziert: false },
    versorgungId: null,
  };
}
