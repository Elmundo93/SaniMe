// ─── OCR Ergebnis ────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface OcrAdresse {
  strasse: string; // inkl. Hausnummer
  plz: string;
  ort: string;
}

export interface OcrPatient {
  name: string;
  dateOfBirth: string;
  // Aus dem Personalienfeld des Rezepts — wird Lieferadresse der Bestellung.
  adresse?: OcrAdresse;
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
  // Katalog-Felder (alle optional — Produkt steckt auch in OnboardingSession und
  // in Events, die müssen ohne sie kompatibel bleiben).
  /** Ein Satz Nutzen für die Katalogkarte; fehlt → beschreibung. */
  kurzbeschreibung?: string;
  /** Nur Kassenartikel: unser Preis, wenn kein Rezept vorliegt (der Kunde zahlt
   * selbst, die Krankenkasse ist nicht beteiligt). Fehlt → ohne Rezept nicht erhältlich. */
  selbstzahlerPreis?: number;
  /** false = derzeit kein aktives, verfügbares Angebot → nicht bestellbar. */
  verfuegbar?: boolean;
  kategorieId?: string;
  /** Feather-Icon der Kategorie — Bild-Platzhalter, solange es keine lizenzierten Fotos gibt. */
  kategorieIcon?: string;
}

export interface ProduktBild {
  url: string;
  /** Pflicht — jedes Bild braucht eine Beschreibung für Screenreader. */
  altText: string;
}

/** Detailform aus GET /products/:id — nur die Detailseite braucht sie. */
export interface ProduktDetail extends Produkt {
  artikelnummer?: string;
  bilder: ProduktBild[];
  /** Strukturierte, filterbare Daten (gewichtKg, faltbar, einsatzort …), siehe katalogFilter.ts. */
  attribute: Record<string, string | number | boolean>;
  kategorieSlug?: string;
  requiresApproval: boolean;
  /** Ausführungen — bestimmen nur die Zubehör-Kompatibilität, bestellt wird das Produkt. */
  varianten: ProduktVariante[];
}

export type ProduktBeziehung = 'zubehoer' | 'ersatzteil' | 'dienstleistung';

export interface ProduktVariante {
  id: string;
  sku: string;
  attribute: Record<string, string | number | boolean>;
}

/** GET /products/:id/related — nach Beziehungsart gruppiert. */
export type PassendeProdukte = Record<ProduktBeziehung, Produkt[]>;

// ─── Katalog-Kategorien ──────────────────────────────────────────────────────

/** GET /catalog/categories — max. zwei Ebenen: parentId null = Hauptkategorie
 * (reine Navigation), sonst Unterkategorie (Produkte hängen immer hier). */
export interface KatalogKategorie {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  beschreibung?: string;
  icon?: string;
  sortOrder: number;
}

// ─── Ratgeber (kuratierte Q&A-Bibliothek) ────────────────────────────────────

export interface QaQuelle {
  titel: string;
  url: string;
}

export interface QaEintrag {
  id: string;
  slug: string;
  frage: string;
  kurzantwort?: string;
  antwort: string;
  quellen: QaQuelle[];
  /** ISO-Datum der letzten redaktionellen Prüfung; null = noch nicht geprüft. */
  geprueftAm: string | null;
}

export interface QaEintragMitProdukten extends QaEintrag {
  produkte: Produkt[];
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

export interface WarenkorbPosition {
  produkt: Produkt;
  // Nur bei Kassenartikeln (produkt.hilfsmittelNr) relevant; null = Rezept fehlt
  // noch. krankenkasse darin ist immer die der Session.
  rezept: OcrResult | null;
  rezeptConfidence: OcrConfidence | null;
  // Der Kunde kauft diesen Kassenartikel bewusst ohne Rezept zum
  // Selbstzahlerpreis — dann braucht er kein Rezept, wird beim Checkout
  // bezahlt und nie bei der Krankenkasse eingereicht.
  ohneRezept: boolean;
  // Optionaler Kontext, wenn das Produkt aus einer Krankheitsbild-Empfehlung
  // kam — für Admin-Sichtbarkeit, keine Guard-Eingabe.
  krankheitsbildId: string | null;
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

  // Krankenkasse der Session — einmal erfasst (eGK-Scan oder Datenprüfung), gilt
  // für die Rezepte aller Positionen. null = noch nicht erfasst.
  krankenkasse: OcrKrankenkasse | null;

  verfügbareProdukte: Produkt[];

  // Der Warenkorb dieser Bestellung. Eine Position je Produkt (Produkt-ID ist
  // zugleich Positions-ID); Kassenartikel tragen ihr eigenes Rezept.
  positionen: WarenkorbPosition[];
  // Für welche Position der laufende Rezept-Scan (REZEPT_AUFNAHME …
  // DATENPRUEFUNG) gedacht ist. null = Rezept-zuerst: das Produkt wird erst
  // auf VERSORGUNGSAUSWAHL gewählt. ocrResult ist dabei der Zwischenstand des
  // laufenden Scans, nicht das Rezept einer Position.
  aktivePositionId: string | null;

  terminVorschläge: TerminSlot[];
  selectedAppointment: TerminSlot | null;

  customerContact: CustomerContact;

  versorgungId: string | null;
}
