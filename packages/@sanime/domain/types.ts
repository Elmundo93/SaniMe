// ─── OCR Ergebnis ────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low';

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

// ─── Produkt ─────────────────────────────────────────────────────────────────

export interface Produkt {
  id: string;
  name: string;
  hersteller: string;
  // Fehlt bei Selbstzahler-Artikeln (kein Hilfsmittelnummer-gelistetes
  // Produkt) — deren Flow überspringt die Krankenkassen-Beteiligung komplett.
  hilfsmittelNr?: string;
  beschreibung: string;
  eigenanteil: number;
  lieferzeit: string;
  kategorie: string;
  merkmale: string[];
}

// ─── Onboarding-Session ──────────────────────────────────────────────────────

export type OnboardingStatus =
  | 'WILLKOMMEN'
  | 'LEISTUNGSUEBERSICHT'
  | 'KRANKHEITSBILD_ERFASSUNG'
  | 'KRANKHEITSBILD_EMPFEHLUNG'
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

  // Von einer Katalog-/Krankheitsbild-Vormerkung gesetzt (siehe onboarding.ts's
  // KATALOG_PRODUKT_VORGEMERKT / KRANKHEITSBILD_PRODUKT_VORGEMERKT) — rein zur
  // Vorauswahl auf VERSORGUNGSAUSWAHL, keine Guard-Eingabe.
  vorausgewaehltesProduktId: string | null;
  // Von KRANKHEITSBILD_AUSGEWAEHLT gesetzt — für spätere Admin-Sichtbarkeit,
  // keine Guard-Eingabe. Kein FK auf eine DB-Tabelle: die Taxonomie ist
  // statische Domain-Daten (siehe krankheitsbild.ts), keine eigene Entität.
  ausgewaehltesKrankheitsbildId: string | null;
  // Reine Navigations-Buchführung (z.B. welches ZURUECK-Event ein Screen
  // dispatchen muss) — niemals als Eingabe für einen Business-Guard nutzen,
  // dafür ist ausschließlich das Fehlen/Vorhandensein von hilfsmittelNr am
  // gewählten Produkt maßgeblich (siehe istAbschlussfaehig in onboarding.ts).
  eintrittspfad: 'REZEPT' | 'KATALOG_SELBSTZAHLER' | 'KRANKHEITSBILD_SELBSTZAHLER';

  terminVorschläge: TerminSlot[];
  selectedAppointment: TerminSlot | null;

  verbindlicheBestätigung: boolean;

  customerContact: CustomerContact;

  versorgungId: string | null;
}
