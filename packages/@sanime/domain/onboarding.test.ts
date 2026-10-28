import {
  betragBeimCheckoutEuro,
  consentErteilt,
  erstelleLeereSession,
  istAbschlussfaehig,
  positionenOhneRezept,
  transition,
  WARENKORB_MAX,
  zahlungBeimCheckoutFaellig,
  type OnboardingEvent,
} from './onboarding';
import { AGB_VERSION, DATENSCHUTZ_VERSION } from './einwilligung';
import type { OcrConfidence, OcrResult, OnboardingSession, Produkt, TerminSlot } from './types';

const HIMI_PRODUKT: Produkt = {
  id: 'produkt-1',
  name: 'Rollstuhl Aktiv SB 40',
  hersteller: 'MobilTech',
  hilfsmittelNr: '00.00.00.0001',
  beschreibung: 'Leichter Standardrollstuhl.',
  eigenanteil: 10,
  lieferzeit: '3 Werktage',
  kategorie: 'Rollstuhl',
  merkmale: ['Faltbar'],
};

const HIMI_PRODUKT_2: Produkt = { ...HIMI_PRODUKT, id: 'produkt-3', name: 'Rollator Leicht', hilfsmittelNr: '00.00.00.0002', eigenanteil: 5, selbstzahlerPreis: 149 };

const SELBSTZAHLER_PRODUKT: Produkt = {
  id: 'produkt-2',
  name: 'Gehstock Basic',
  hersteller: 'AktivCare',
  beschreibung: 'Einfacher Gehstock ohne Rezeptpflicht.',
  eigenanteil: 24.9,
  lieferzeit: '3 Werktage',
  kategorie: 'Gehhilfen',
  merkmale: [],
};

const REZEPT: OcrResult = {
  patient: { name: 'Erika Mustermann', dateOfBirth: '1950-01-01' },
  arzt: { name: 'Dr. Beispiel' },
  krankenkasse: { name: '', versichertenNr: '' },
  diagnose: 'Gangunsicherheit',
  hilfsmittel: 'Rollstuhl',
  datum: '2026-10-01',
};
const KRANKENKASSE = { name: 'Beispiel-BKK', versichertenNr: 'A123456789' };
const CONFIDENCE: OcrConfidence = { patient: 'high', arzt: 'high', krankenkasse: 'high', diagnose: 'high', hilfsmittel: 'high' };
const TERMIN: TerminSlot = { id: 't1', beginn: '2026-11-02T09:00:00Z', ende: '2026-11-02T10:00:00Z', ort: 'Filiale' };

function mitConsent(session: OnboardingSession): OnboardingSession {
  return {
    ...session,
    consent: {
      agb: { akzeptiert: true, version: '1', zeitpunkt: new Date().toISOString() },
      datenschutz: { akzeptiert: true, version: '1', zeitpunkt: new Date().toISOString() },
    },
  };
}

// Wendet Events nacheinander an und bricht beim ersten abgelehnten ab.
function schritte(session: OnboardingSession, ...events: OnboardingEvent[]): OnboardingSession {
  return events.reduce((s, event) => {
    const result = transition(s, event);
    if (!result.ok) throw new Error(`${event.type} aus ${s.status} abgelehnt: ${result.reason}`);
    return result.session;
  }, session);
}

function warenkorb(...produkte: Produkt[]): OnboardingEvent {
  return { type: 'WARENKORB_UEBERNOMMEN', artikel: produkte.map((p) => ({ produktId: p.id })), produkte };
}

function leistungsuebersicht(id = 's'): OnboardingSession {
  return schritte(mitConsent(erstelleLeereSession(id)), { type: 'WEITER' });
}

const REZEPT_SCAN: OnboardingEvent[] = [
  { type: 'REZEPT_OCR_ABGESCHLOSSEN', uri: 'file://rezept.jpg', result: REZEPT, confidence: CONFIDENCE },
  { type: 'WEITER' },
  { type: 'KRANKENKASSE_OCR_ABGESCHLOSSEN', uri: 'file://egk.jpg', krankenkasse: KRANKENKASSE, confidence: 'high', produkte: [] },
];

describe('onboarding FSM — Rezept zuerst', () => {
  it('führt vom Rezept-Scan über die Versorgungsauswahl in den Checkout und legt eine Position mit Rezept an', () => {
    let session = schritte(leistungsuebersicht(), { type: 'WEITER' }, ...REZEPT_SCAN, { type: 'WEITER' });
    expect(session.status).toBe('VERSORGUNGSAUSWAHL');

    session = schritte(session, { type: 'SUPPLY_AUSGEWAEHLT', produkt: HIMI_PRODUKT });
    expect(session.status).toBe('CHECKOUT');
    expect(session.positionen).toHaveLength(1);
    expect(session.positionen[0].rezept?.krankenkasse).toEqual(KRANKENKASSE);
    expect(session.ocrResult).toBeNull();
    expect(positionenOhneRezept(session)).toEqual([]);
  });

  it('lehnt ein Selbstzahler-Produkt auf der Versorgungsauswahl ab', () => {
    const session = schritte(leistungsuebersicht(), { type: 'WEITER' }, ...REZEPT_SCAN, { type: 'WEITER' });
    expect(transition(session, { type: 'SUPPLY_AUSGEWAEHLT', produkt: SELBSTZAHLER_PRODUKT }).ok).toBe(false);
  });

  it('lehnt ein Event ohne passende Zeile ab', () => {
    expect(transition(erstelleLeereSession('s2'), { type: 'SUPPLY_AUSGEWAEHLT', produkt: HIMI_PRODUKT }).ok).toBe(false);
  });

  it('übernimmt die Kassendaten aus dem Rezept und überspringt dann den Kartenscan', () => {
    const rezeptMitKasse: OcrResult = { ...REZEPT, krankenkasse: KRANKENKASSE };
    let session = schritte(leistungsuebersicht(), { type: 'WEITER' }, {
      type: 'REZEPT_OCR_ABGESCHLOSSEN',
      uri: 'file://rezept.jpg',
      result: rezeptMitKasse,
      confidence: CONFIDENCE,
    });
    expect(session.krankenkasse).toEqual(KRANKENKASSE);

    session = schritte(session, { type: 'WEITER_KRANKENKASSE_BEKANNT' });
    expect(session.status).toBe('DATENPRUEFUNG');
  });

  it('führt aus der Datenprüfung zur Rezeptprüfung zurück, wenn die Karte übersprungen wurde', () => {
    const rezeptMitKasse: OcrResult = { ...REZEPT, krankenkasse: KRANKENKASSE };
    const session = schritte(
      leistungsuebersicht(),
      { type: 'WEITER' },
      { type: 'REZEPT_OCR_ABGESCHLOSSEN', uri: 'file://rezept.jpg', result: rezeptMitKasse, confidence: CONFIDENCE },
      { type: 'WEITER_KRANKENKASSE_BEKANNT' },
      { type: 'ZURUECK_REZEPTPRUEFUNG' },
    );
    expect(session.status).toBe('REZEPT_PRUEFUNG');
    expect(session.ocrResult?.hilfsmittel).toBe(REZEPT.hilfsmittel);
  });

  it('lässt ZURUECK_REZEPTPRUEFUNG ohne bekannte Krankenkasse nicht zu', () => {
    const session = schritte(leistungsuebersicht(), { type: 'WEITER' }, ...REZEPT_SCAN.slice(0, 2), {
      type: 'KRANKENKASSE_UEBERSPRUNGEN',
      produkte: [],
    });
    expect(session.status).toBe('DATENPRUEFUNG');
    expect(transition(session, { type: 'ZURUECK_REZEPTPRUEFUNG' }).ok).toBe(false);
  });

  it('überschreibt eine bekannte Krankenkasse nicht mit den Daten eines weiteren Rezepts', () => {
    const anderesRezept: OcrResult = { ...REZEPT, krankenkasse: { name: 'Andere Kasse', versichertenNr: 'B987654320' } };
    let session = schritte(leistungsuebersicht(), { type: 'WEITER' }, ...REZEPT_SCAN, { type: 'ZURUECK' }, { type: 'ZURUECK' }, { type: 'ZURUECK' });
    expect(session.status).toBe('REZEPT_AUFNAHME');
    session = schritte(session, { type: 'REZEPT_OCR_ABGESCHLOSSEN', uri: 'file://r2.jpg', result: anderesRezept, confidence: CONFIDENCE });
    expect(session.krankenkasse).toEqual(KRANKENKASSE);
    expect(session.ocrResult?.krankenkasse).toEqual(KRANKENKASSE);
  });
});

describe('onboarding FSM — Warenkorb', () => {
  it('übernimmt mehrere Produkte nach erteilter Einwilligung direkt in den Checkout', () => {
    const session = schritte(leistungsuebersicht(), warenkorb(HIMI_PRODUKT, SELBSTZAHLER_PRODUKT));
    expect(session.status).toBe('CHECKOUT');
    expect(session.positionen.map((p) => p.produkt.id)).toEqual([HIMI_PRODUKT.id, SELBSTZAHLER_PRODUKT.id]);
    expect(positionenOhneRezept(session).map((p) => p.produkt.id)).toEqual([HIMI_PRODUKT.id]);
  });

  it('ist ohne Einwilligung gesperrt', () => {
    const ohne = schritte(erstelleLeereSession('w0'), { type: 'WEITER' });
    expect(transition(ohne, warenkorb(SELBSTZAHLER_PRODUKT)).ok).toBe(false);
  });

  it('lehnt leere, doppelte und zu große Warenkörbe ab', () => {
    const session = leistungsuebersicht();
    expect(transition(session, warenkorb()).ok).toBe(false);
    expect(transition(session, warenkorb(HIMI_PRODUKT, HIMI_PRODUKT)).ok).toBe(false);
    const zuViele = Array.from({ length: WARENKORB_MAX + 1 }, (_, i) => ({ ...SELBSTZAHLER_PRODUKT, id: `p${i}` }));
    expect(transition(session, warenkorb(...zuViele)).ok).toBe(false);
  });

  it('gleicht beim erneuten Übernehmen ab: Rezepte bleiben, entfernte Artikel fallen weg', () => {
    let session = schritte(
      leistungsuebersicht(),
      warenkorb(HIMI_PRODUKT, SELBSTZAHLER_PRODUKT),
      { type: 'REZEPT_FUER_POSITION', produktId: HIMI_PRODUKT.id },
      ...REZEPT_SCAN,
      { type: 'REZEPT_ZUGEORDNET' },
    );
    session = schritte(session, warenkorb(HIMI_PRODUKT, HIMI_PRODUKT_2));
    expect(session.positionen.map((p) => p.produkt.id)).toEqual([HIMI_PRODUKT.id, HIMI_PRODUKT_2.id]);
    expect(session.positionen[0].rezept).not.toBeNull();
    expect(session.positionen[1].rezept).toBeNull();
  });

  it('merkt sich den optionalen Krankheitsbild-Kontext je Position', () => {
    const session = schritte(leistungsuebersicht(), {
      type: 'WARENKORB_UEBERNOMMEN',
      artikel: [{ produktId: HIMI_PRODUKT.id, krankheitsbildId: 'mobilitaet' }],
      produkte: [HIMI_PRODUKT],
    });
    expect(session.positionen[0].krankheitsbildId).toBe('mobilitaet');
  });
});

describe('onboarding FSM — Rezept im Checkout nachpflegen', () => {
  it('ordnet ein im Checkout gescanntes Rezept der gewählten Position zu', () => {
    let session = schritte(leistungsuebersicht(), warenkorb(HIMI_PRODUKT, SELBSTZAHLER_PRODUKT));
    session = schritte(session, { type: 'REZEPT_FUER_POSITION', produktId: HIMI_PRODUKT.id });
    expect(session.status).toBe('REZEPT_AUFNAHME');
    expect(session.aktivePositionId).toBe(HIMI_PRODUKT.id);

    session = schritte(session, ...REZEPT_SCAN);
    // Rezept-zuerst-Weiter ist mit aktiver Position gesperrt — es muss zugeordnet werden.
    expect(transition(session, { type: 'WEITER' }).ok).toBe(false);
    session = schritte(session, { type: 'REZEPT_ZUGEORDNET' });
    expect(session.status).toBe('CHECKOUT');
    expect(session.aktivePositionId).toBeNull();
    expect(positionenOhneRezept(session)).toEqual([]);
  });

  it('erlaubt das Scannen nur für Kassenartikel', () => {
    const session = schritte(leistungsuebersicht(), warenkorb(SELBSTZAHLER_PRODUKT));
    expect(transition(session, { type: 'REZEPT_FUER_POSITION', produktId: SELBSTZAHLER_PRODUKT.id }).ok).toBe(false);
    expect(transition(session, { type: 'REZEPT_FUER_POSITION', produktId: 'unbekannt' }).ok).toBe(false);
  });

  it('überspringt die Krankenkassenkarte beim zweiten Rezept', () => {
    let session = schritte(
      leistungsuebersicht(),
      warenkorb(HIMI_PRODUKT, HIMI_PRODUKT_2),
      { type: 'REZEPT_FUER_POSITION', produktId: HIMI_PRODUKT.id },
      ...REZEPT_SCAN,
      { type: 'REZEPT_ZUGEORDNET' },
      { type: 'REZEPT_FUER_POSITION', produktId: HIMI_PRODUKT_2.id },
      { type: 'REZEPT_OCR_ABGESCHLOSSEN', uri: 'file://rezept2.jpg', result: REZEPT, confidence: CONFIDENCE },
    );
    expect(session.ocrResult?.krankenkasse).toEqual(KRANKENKASSE);
    session = schritte(session, { type: 'WEITER_KRANKENKASSE_BEKANNT' }, { type: 'REZEPT_ZUGEORDNET' });
    expect(positionenOhneRezept(session)).toEqual([]);
  });

  it('lässt WEITER_KRANKENKASSE_BEKANNT ohne bekannte Krankenkasse nicht zu', () => {
    const session = schritte(
      leistungsuebersicht(),
      warenkorb(HIMI_PRODUKT),
      { type: 'REZEPT_FUER_POSITION', produktId: HIMI_PRODUKT.id },
      REZEPT_SCAN[0],
    );
    expect(transition(session, { type: 'WEITER_KRANKENKASSE_BEKANNT' }).ok).toBe(false);
  });

  it('führt aus dem Rezept-Scan per ZURUECK_CHECKOUT zurück und verwirft den Zwischenstand', () => {
    const session = schritte(
      leistungsuebersicht(),
      warenkorb(HIMI_PRODUKT),
      { type: 'REZEPT_FUER_POSITION', produktId: HIMI_PRODUKT.id },
      REZEPT_SCAN[0],
      { type: 'ZURUECK' },
      { type: 'ZURUECK_CHECKOUT' },
    );
    expect(session.status).toBe('CHECKOUT');
    expect(session.ocrResult).toBeNull();
    expect(session.aktivePositionId).toBeNull();
  });

  it('ZURUECK aus der Rezeptaufnahme führt nur ohne Positionen auf die Leistungsübersicht', () => {
    const mitPosition = schritte(leistungsuebersicht(), warenkorb(HIMI_PRODUKT), { type: 'REZEPT_HINZUFUEGEN' });
    expect(transition(mitPosition, { type: 'ZURUECK' }).ok).toBe(false);
    const ohne = schritte(leistungsuebersicht(), { type: 'WEITER' });
    expect(transition(ohne, { type: 'ZURUECK_CHECKOUT' }).ok).toBe(false);
  });

  it('bearbeitet ein zugeordnetes Rezept direkt in der Datenprüfung', () => {
    let session = schritte(
      leistungsuebersicht(),
      warenkorb(HIMI_PRODUKT),
      { type: 'REZEPT_FUER_POSITION', produktId: HIMI_PRODUKT.id },
      ...REZEPT_SCAN,
      { type: 'REZEPT_ZUGEORDNET' },
      { type: 'REZEPT_BEARBEITEN', produktId: HIMI_PRODUKT.id },
    );
    expect(session.status).toBe('DATENPRUEFUNG');
    session = schritte(session, { type: 'FELD_KORRIGIERT', patch: { diagnose: 'Korrigiert' } }, { type: 'REZEPT_ZUGEORDNET' });
    expect(session.positionen[0].rezept?.diagnose).toBe('Korrigiert');
  });

  it('lehnt REZEPT_BEARBEITEN für eine Position ohne Rezept ab', () => {
    const session = schritte(leistungsuebersicht(), warenkorb(HIMI_PRODUKT));
    expect(transition(session, { type: 'REZEPT_BEARBEITEN', produktId: HIMI_PRODUKT.id }).ok).toBe(false);
  });

  it('nimmt per REZEPT_HINZUFUEGEN ein weiteres Rezept-zuerst-Produkt in die Bestellung auf', () => {
    const session = schritte(
      leistungsuebersicht(),
      warenkorb(SELBSTZAHLER_PRODUKT),
      { type: 'REZEPT_HINZUFUEGEN' },
      ...REZEPT_SCAN,
      { type: 'WEITER' },
      { type: 'SUPPLY_AUSGEWAEHLT', produkt: HIMI_PRODUKT },
    );
    expect(session.positionen.map((p) => p.produkt.id)).toEqual([SELBSTZAHLER_PRODUKT.id, HIMI_PRODUKT.id]);
  });
});

describe('onboarding FSM — Kassenartikel ohne Rezept', () => {
  it('kauft einen Kassenartikel ohne Rezept zum Selbstzahlerpreis — kein Rezept nötig, Zahlung beim Checkout', () => {
    const session = schritte(
      leistungsuebersicht(),
      warenkorb(HIMI_PRODUKT_2),
      { type: 'TERMIN_WAEHLEN' },
      { type: 'TERMIN_AUSGEWAEHLT', termin: TERMIN },
      { type: 'POSITION_OHNE_REZEPT', produktId: HIMI_PRODUKT_2.id, ohneRezept: true },
    );
    expect(positionenOhneRezept(session)).toEqual([]);
    expect(betragBeimCheckoutEuro(session)).toBe(149);
    expect(zahlungBeimCheckoutFaellig(session)).toBe(true);
    const bestaetigt = { ...session, customerContact: { email: null, telefon: '+491511234567', telefonVerifiziert: true } };
    expect(transition(bestaetigt, { type: 'AUFTRAG_EINGEREICHT' }).ok).toBe(false);
    expect(transition(bestaetigt, { type: 'ZAHLUNG_ERFOLGREICH' }).ok).toBe(true);
  });

  it('ist ohne Selbstzahlerpreis nicht möglich und nie für Selbstzahler-Artikel', () => {
    const session = schritte(leistungsuebersicht(), warenkorb(HIMI_PRODUKT, SELBSTZAHLER_PRODUKT));
    expect(transition(session, { type: 'POSITION_OHNE_REZEPT', produktId: HIMI_PRODUKT.id, ohneRezept: true }).ok).toBe(false);
    expect(transition(session, { type: 'POSITION_OHNE_REZEPT', produktId: SELBSTZAHLER_PRODUKT.id, ohneRezept: true }).ok).toBe(false);
  });

  it('wechselt zurück zum Rezept, sobald eines zugeordnet wird', () => {
    const session = schritte(
      leistungsuebersicht(),
      warenkorb(HIMI_PRODUKT_2),
      { type: 'POSITION_OHNE_REZEPT', produktId: HIMI_PRODUKT_2.id, ohneRezept: true },
      { type: 'REZEPT_FUER_POSITION', produktId: HIMI_PRODUKT_2.id },
      ...REZEPT_SCAN,
      { type: 'REZEPT_ZUGEORDNET' },
    );
    expect(session.positionen[0].ohneRezept).toBe(false);
    expect(betragBeimCheckoutEuro(session)).toBe(0);
  });
});

describe('onboarding FSM — Termin als Speiche des Checkouts', () => {
  it('führt vom Checkout zur Terminwahl und zurück', () => {
    const session = schritte(
      leistungsuebersicht(),
      warenkorb(SELBSTZAHLER_PRODUKT),
      { type: 'TERMIN_WAEHLEN' },
      { type: 'TERMIN_AUSGEWAEHLT', termin: TERMIN },
    );
    expect(session.status).toBe('CHECKOUT');
    expect(session.selectedAppointment).toEqual(TERMIN);
    const zurueck = schritte(session, { type: 'TERMIN_WAEHLEN' }, { type: 'ZURUECK' });
    expect(zurueck.status).toBe('CHECKOUT');
  });
});

describe('onboarding FSM — dauerhafte Einwilligung', () => {
  const aktuell = { agbVersion: AGB_VERSION, datenschutzVersion: DATENSCHUTZ_VERSION };

  it('takes over a current consent from WILLKOMMEN straight into LEISTUNGSUEBERSICHT', () => {
    const result = transition(erstelleLeereSession('e1'), { type: 'EINWILLIGUNG_UEBERNOMMEN', einwilligungsToken: 't', ...aktuell });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.status).toBe('LEISTUNGSUEBERSICHT');
    expect(consentErteilt(result.session)).toBe(true);
    const weiter = transition(result.session, warenkorb(SELBSTZAHLER_PRODUKT));
    expect(weiter.ok && weiter.session.status).toBe('CHECKOUT');
  });

  it('rejects a consent for outdated legal texts', () => {
    const alt = transition(erstelleLeereSession('e2'), {
      type: 'EINWILLIGUNG_UEBERNOMMEN',
      agbVersion: '2000-01-01',
      datenschutzVersion: DATENSCHUTZ_VERSION,
    });
    expect(alt.ok).toBe(false);
  });

  it('is only possible from WILLKOMMEN', () => {
    const session = schritte(erstelleLeereSession('e3'), { type: 'WEITER' });
    expect(transition(session, { type: 'EINWILLIGUNG_UEBERNOMMEN', ...aktuell }).ok).toBe(false);
  });
});

describe('Checkout-Abschluss', () => {
  function imCheckout(...produkte: Produkt[]): OnboardingSession {
    return {
      ...schritte(leistungsuebersicht(), warenkorb(...produkte), { type: 'TERMIN_WAEHLEN' }, { type: 'TERMIN_AUSGEWAEHLT', termin: TERMIN }),
      customerContact: { email: null, telefon: '+491511234567', telefonVerifiziert: true },
    };
  }

  function mitRezepten(session: OnboardingSession): OnboardingSession {
    return {
      ...session,
      positionen: session.positionen.map((p) =>
        p.produkt.hilfsmittelNr ? { ...p, rezept: { ...REZEPT, krankenkasse: KRANKENKASSE }, rezeptConfidence: CONFIDENCE } : p,
      ),
    };
  }

  it('ist ohne Rezept für einen Kassenartikel nicht abschlussfähig', () => {
    const session = imCheckout(HIMI_PRODUKT, SELBSTZAHLER_PRODUKT);
    expect(istAbschlussfaehig(session)).toBe(false);
    expect(istAbschlussfaehig(mitRezepten(session))).toBe(true);
  });

  it('ist ohne Termin nicht abschlussfähig', () => {
    expect(istAbschlussfaehig({ ...imCheckout(SELBSTZAHLER_PRODUKT), selectedAppointment: null })).toBe(false);
  });

  it('berechnet die Zahlung nur aus den Selbstzahler-Artikeln', () => {
    const gemischt = mitRezepten(imCheckout(HIMI_PRODUKT, SELBSTZAHLER_PRODUKT));
    expect(betragBeimCheckoutEuro(gemischt)).toBeCloseTo(24.9);
    expect(zahlungBeimCheckoutFaellig(gemischt)).toBe(true);
    expect(zahlungBeimCheckoutFaellig(mitRezepten(imCheckout(HIMI_PRODUKT)))).toBe(false);
    expect(zahlungBeimCheckoutFaellig(imCheckout({ ...SELBSTZAHLER_PRODUKT, eigenanteil: 0 }))).toBe(false);
  });

  it('schließt eine reine Rezept-Bestellung per AUFTRAG_EINGEREICHT ab, nie per ZAHLUNG_ERFOLGREICH', () => {
    const session = mitRezepten(imCheckout(HIMI_PRODUKT, HIMI_PRODUKT_2));
    const eingereicht = transition(session, { type: 'AUFTRAG_EINGEREICHT' });
    expect(eingereicht.ok && eingereicht.session.status).toBe('ABGESCHLOSSEN');
    expect(transition(session, { type: 'ZAHLUNG_ERFOLGREICH' }).ok).toBe(false);
  });

  it('schließt eine Bestellung mit Selbstzahler-Anteil nur per ZAHLUNG_ERFOLGREICH ab', () => {
    const session = mitRezepten(imCheckout(HIMI_PRODUKT, SELBSTZAHLER_PRODUKT));
    expect(transition(session, { type: 'AUFTRAG_EINGEREICHT' }).ok).toBe(false);
    const bezahlt = transition(session, { type: 'ZAHLUNG_ERFOLGREICH' });
    expect(bezahlt.ok && bezahlt.session.status).toBe('ABGESCHLOSSEN');
  });

  it('verlangt eine bestätigte Telefonnummer', () => {
    const unbestaetigt: OnboardingSession = {
      ...mitRezepten(imCheckout(HIMI_PRODUKT)),
      customerContact: { email: null, telefon: '+491511234567', telefonVerifiziert: false },
    };
    expect(transition(unbestaetigt, { type: 'AUFTRAG_EINGEREICHT' }).ok).toBe(false);
  });
});
