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

// ─── Bestellung ──────────────────────────────────────────────────────────────
//
// OCR-Ergebnis-/Confidence-Typen und `Produkt` leben jetzt in @sanime/domain
// (embedded in OnboardingSession, die dort ebenfalls definiert ist).

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
//
// OnboardingStatus/OnboardingSession/OnboardingConsent/Einwilligung/TerminSlot/
// CustomerContact leben jetzt in @sanime/domain.
