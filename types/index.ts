// ─── Enums ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING_PRESCRIPTION'
  | 'PENDING_REVIEW'
  | 'PENDING_INSURANCE'
  | 'APPROVED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// ─── OCR Ergebnis ────────────────────────────────────────────────────────────

export interface OcrPatient {
  name: string;
  dateOfBirth: string;
}

export interface OcrArzt {
  name: string;
  lanr?: string;
}

export interface OcrKrankenkasse {
  name: string;
  ik?: string;
  versichertenNr: string;
}

export interface OcrResult {
  patient: OcrPatient;
  arzt: OcrArzt;
  krankenkasse: OcrKrankenkasse;
  diagnose: string;
  hilfsmittel: string;
  hilfsmittelNr?: string;
  datum: string;
}

export interface OcrConfidence {
  patient: ConfidenceLevel;
  arzt: ConfidenceLevel;
  krankenkasse: ConfidenceLevel;
  diagnose: ConfidenceLevel;
  hilfsmittel: ConfidenceLevel;
}

// ─── Produkt / Versorgung ────────────────────────────────────────────────────

export interface Produkt {
  id: string;
  name: string;
  hersteller: string;
  hilfsmittelNr: string;
  beschreibung: string;
  eigenanteil: number;
  lieferzeit: string;
  kategorie: string;
  merkmale: string[];
}

// ─── Bestellung ──────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  status: OrderStatus;
  label: string;
  beschreibung: string;
  zeitpunkt: string;
  abgeschlossen: boolean;
}

export interface OffeneAktion {
  id: string;
  titel: string;
  beschreibung: string;
  typ: 'kamera' | 'formular' | 'info';
}

export interface Versorgung {
  id: string;
  status: OrderStatus;
  produkt: string;
  hilfsmittelNr: string;
  arzt: string;
  krankenkasse: string;
  erstellt: string;
  aktualisiert: string;
  timeline: TimelineEvent[];
  offeneAktionen: OffeneAktion[];
  lieferadresse?: string;
  hersteller?: string;
  ansprechpartner?: string;
  lieferzeit?: string;
}

// ─── Benutzer ────────────────────────────────────────────────────────────────

export interface Adresse {
  strasse: string; // inkl. Hausnummer, z.B. "Musterstraße 12"
  plz: string;
  ort: string;
}

export interface Benutzer {
  id: string;
  vorname: string;
  nachname: string;
  email?: string;
  telefon: string;
  krankenkasse?: string;
  versichertenNr?: string;
  lieferadresse?: Adresse;
}

// ─── Onboarding-Session ──────────────────────────────────────────────────────

export type OnboardingStatus =
  | 'WILLKOMMEN'
  | 'LEISTUNGSUEBERSICHT'
  | 'REZEPT_AUFNAHME'
  | 'REZEPT_PRUEFUNG'
  | 'KRANKENKASSE_AUFNAHME'
  | 'DATENPRUEFUNG'
  | 'VERSORGUNGSAUSWAHL'
  | 'TERMINPLANUNG'
  | 'ZUSAMMENFASSUNG'
  | 'CHECKOUT'
  | 'CHECKOUT_FEHLGESCHLAGEN'
  | 'ABGESCHLOSSEN';

export interface Einwilligung {
  akzeptiert: boolean;
  version: string;
  zeitpunkt: string | null;
  // vom Backend beim Sync gesetzt, nie client-seitig
  ipAdresse?: string;
}

export interface OnboardingConsent {
  agb: Einwilligung;
  datenschutz: Einwilligung;
}

export interface TerminSlot {
  id: string;
  beginn: string;
  ende: string;
  ort: string;
  hinweis?: string;
}

export interface CustomerContact {
  email: string | null;
  telefon: string | null;
  telefonVerifiziert: boolean;
}

export interface OnboardingSession {
  id: string;
  status: OnboardingStatus;
  erstellt: string;
  aktualisiert: string;
  completedAt: string | null;

  consent: OnboardingConsent;

  rezeptFotoUri: string | null;
  krankenkasseFotoUri: string | null;
  krankenkasseUebersprungen: boolean;
  ocrResult: OcrResult | null;
  ocrConfidence: OcrConfidence | null;
  ocrBearbeitet: boolean;

  verfügbareProdukte: Produkt[];
  selectedSupply: Produkt | null;

  terminVorschläge: TerminSlot[];
  selectedAppointment: TerminSlot | null;

  verbindlicheBestätigung: boolean;

  customerContact: CustomerContact;

  versorgungId: string | null;
}
