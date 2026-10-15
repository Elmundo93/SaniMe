import { erstelleLeereSession, istAbschlussfaehig, transition, zahlungBeimCheckoutFaellig } from './onboarding';
import type { OnboardingSession, Produkt } from './types';

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

function mitConsent(session: OnboardingSession): OnboardingSession {
  return {
    ...session,
    consent: {
      agb: { akzeptiert: true, version: '1', zeitpunkt: new Date().toISOString() },
      datenschutz: { akzeptiert: true, version: '1', zeitpunkt: new Date().toISOString() },
    },
  };
}

describe('onboarding FSM — klassischer Rezept-Pfad', () => {
  it('durchläuft WILLKOMMEN bis VERSORGUNGSAUSWAHL nur mit vollständigen Rezept-Pflichtfeldern', () => {
    let session = erstelleLeereSession('s1');
    session = mitConsent(session);

    let result = transition(session, { type: 'WEITER' });
    expect(result.ok).toBe(true);
    session = (result as { ok: true; session: OnboardingSession }).session;

    result = transition(session, { type: 'WEITER' });
    expect(result.ok).toBe(true);
    session = (result as { ok: true; session: OnboardingSession }).session;
    expect(session.status).toBe('REZEPT_AUFNAHME');
  });

  it('rejects an event with no matching transition row', () => {
    const session = erstelleLeereSession('s2');
    const result = transition(session, { type: 'SUPPLY_AUSGEWAEHLT', produkt: HIMI_PRODUKT });
    expect(result.ok).toBe(false);
  });
});

describe('onboarding FSM — Katalog-Vorauswahl (HiMi-Produkt)', () => {
  it('routes into REZEPT_AUFNAHME once consent is granted', () => {
    let session = erstelleLeereSession('s3');
    session = mitConsent(session);
    session = (transition(session, { type: 'WEITER' }) as { ok: true; session: OnboardingSession }).session;
    expect(session.status).toBe('LEISTUNGSUEBERSICHT');

    const result = transition(session, { type: 'KATALOG_PRODUKT_VORGEMERKT', produktId: HIMI_PRODUKT.id });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.status).toBe('REZEPT_AUFNAHME');
      expect(result.session.vorausgewaehltesProduktId).toBe(HIMI_PRODUKT.id);
    }
  });

  it('is blocked by the same consent guard as plain WEITER', () => {
    const session = erstelleLeereSession('s4'); // no consent granted
    const withStep = transition(session, { type: 'WEITER' });
    expect(withStep.ok).toBe(true);
    if (!withStep.ok) return;
    const result = transition(withStep.session, {
      type: 'KATALOG_PRODUKT_VORGEMERKT',
      produktId: HIMI_PRODUKT.id,
    });
    expect(result.ok).toBe(false);
  });
});

describe('onboarding FSM — Katalog-Selbstzahler-Pfad', () => {
  it('routes straight into TERMINPLANUNG, skipping Rezept/Krankenkasse/Datenpruefung', () => {
    let session = erstelleLeereSession('s5');
    session = mitConsent(session);
    session = (transition(session, { type: 'WEITER' }) as { ok: true; session: OnboardingSession }).session;

    const result = transition(session, {
      type: 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT',
      produkt: SELBSTZAHLER_PRODUKT,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.status).toBe('TERMINPLANUNG');
      expect(result.session.selectedSupply).toEqual(SELBSTZAHLER_PRODUKT);
      expect(result.session.eintrittspfad).toBe('KATALOG_SELBSTZAHLER');
    }
  });

  it('supports ZURUECK_KATALOG back to LEISTUNGSUEBERSICHT — a distinct event from plain ZURUECK, which still targets VERSORGUNGSAUSWAHL', () => {
    // ZURUECK's existing (unconditional) row from TERMINPLANUNG is shared by
    // both entry paths at the FSM level — it is the *screen's* job (see
    // app/scan/termin.tsx) to dispatch the event matching session.eintrittspfad,
    // not the FSM's job to reject the "wrong" one for a given path.
    let session = erstelleLeereSession('s6');
    session = mitConsent(session);
    session = (transition(session, { type: 'WEITER' }) as { ok: true; session: OnboardingSession }).session;
    session = (
      transition(session, {
        type: 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT',
        produkt: SELBSTZAHLER_PRODUKT,
      }) as { ok: true; session: OnboardingSession }
    ).session;

    const plainZurueck = transition(session, { type: 'ZURUECK' });
    expect(plainZurueck.ok).toBe(true);
    if (plainZurueck.ok) expect(plainZurueck.session.status).toBe('VERSORGUNGSAUSWAHL');

    const result = transition(session, { type: 'ZURUECK_KATALOG' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.status).toBe('LEISTUNGSUEBERSICHT');
  });
});

describe('onboarding FSM — Krankheitsbild-Pfad', () => {
  function beiKrankheitsbildEmpfehlung(): OnboardingSession {
    let session = erstelleLeereSession('kb1');
    session = mitConsent(session);
    session = (transition(session, { type: 'WEITER' }) as { ok: true; session: OnboardingSession }).session;
    session = (
      transition(session, { type: 'KRANKHEITSBILD_STARTEN' }) as { ok: true; session: OnboardingSession }
    ).session;
    expect(session.status).toBe('KRANKHEITSBILD_ERFASSUNG');
    session = (
      transition(session, {
        type: 'KRANKHEITSBILD_AUSGEWAEHLT',
        krankheitsbildId: 'mobilitaet',
        produkte: [HIMI_PRODUKT, SELBSTZAHLER_PRODUKT],
      }) as { ok: true; session: OnboardingSession }
    ).session;
    expect(session.status).toBe('KRANKHEITSBILD_EMPFEHLUNG');
    expect(session.ausgewaehltesKrankheitsbildId).toBe('mobilitaet');
    return session;
  }

  it('routes a HiMi pick into REZEPT_AUFNAHME, rejoining the classic chain', () => {
    const session = beiKrankheitsbildEmpfehlung();
    const result = transition(session, { type: 'KRANKHEITSBILD_PRODUKT_VORGEMERKT', produktId: HIMI_PRODUKT.id });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.status).toBe('REZEPT_AUFNAHME');
      expect(result.session.eintrittspfad).toBe('REZEPT');
    }
  });

  it('routes a self-pay pick straight into TERMINPLANUNG', () => {
    const session = beiKrankheitsbildEmpfehlung();
    const result = transition(session, {
      type: 'KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT',
      produkt: SELBSTZAHLER_PRODUKT,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.status).toBe('TERMINPLANUNG');
      expect(result.session.eintrittspfad).toBe('KRANKHEITSBILD_SELBSTZAHLER');
    }
  });

  it('supports ZURUECK_KRANKHEITSBILD back to KRANKHEITSBILD_EMPFEHLUNG', () => {
    const session = (
      transition(beiKrankheitsbildEmpfehlung(), {
        type: 'KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT',
        produkt: SELBSTZAHLER_PRODUKT,
      }) as { ok: true; session: OnboardingSession }
    ).session;
    const result = transition(session, { type: 'ZURUECK_KRANKHEITSBILD' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.status).toBe('KRANKHEITSBILD_EMPFEHLUNG');
  });

  it('is blocked by the same consent guard as the other LEISTUNGSUEBERSICHT entry events', () => {
    let session = erstelleLeereSession('kb2');
    session = (transition(session, { type: 'WEITER' }) as { ok: true; session: OnboardingSession }).session;
    const result = transition(session, { type: 'KRANKHEITSBILD_STARTEN' });
    expect(result.ok).toBe(false);
  });
});

describe('istAbschlussfaehig', () => {
  it('is satisfied for a self-pay product with no Rezept-OCR at all', () => {
    const session: OnboardingSession = { ...erstelleLeereSession('s7'), selectedSupply: SELBSTZAHLER_PRODUKT };
    expect(istAbschlussfaehig(session)).toBe(true);
  });

  it('still requires hatPflichtfelderKomplett for a HiMi product', () => {
    const session: OnboardingSession = { ...erstelleLeereSession('s8'), selectedSupply: HIMI_PRODUKT };
    expect(istAbschlussfaehig(session)).toBe(false);
  });
});

describe('Checkout-Abschluss — Zahlung nur für Selbstzahler', () => {
  function imCheckout(produkt: Produkt): OnboardingSession {
    return {
      ...erstelleLeereSession('s-checkout'),
      status: 'CHECKOUT',
      selectedSupply: produkt,
      customerContact: { email: null, telefon: '+491511234567', telefonVerifiziert: true },
    };
  }

  it('verlangt beim Checkout nur für einen kostenpflichtigen Selbstzahler-Artikel eine Zahlung', () => {
    expect(zahlungBeimCheckoutFaellig(imCheckout(SELBSTZAHLER_PRODUKT))).toBe(true);
    expect(zahlungBeimCheckoutFaellig(imCheckout(HIMI_PRODUKT))).toBe(false);
    expect(zahlungBeimCheckoutFaellig(imCheckout({ ...SELBSTZAHLER_PRODUKT, eigenanteil: 0 }))).toBe(false);
  });

  it('schließt eine Rezept-Versorgung per AUFTRAG_EINGEREICHT ab, nie per ZAHLUNG_ERFOLGREICH', () => {
    const session = imCheckout(HIMI_PRODUKT);
    const eingereicht = transition(session, { type: 'AUFTRAG_EINGEREICHT' });
    expect(eingereicht.ok && eingereicht.session.status).toBe('ABGESCHLOSSEN');
    expect(transition(session, { type: 'ZAHLUNG_ERFOLGREICH' }).ok).toBe(false);
  });

  it('schließt einen kostenpflichtigen Selbstzahler-Kauf nur per ZAHLUNG_ERFOLGREICH ab', () => {
    const session = imCheckout(SELBSTZAHLER_PRODUKT);
    expect(transition(session, { type: 'AUFTRAG_EINGEREICHT' }).ok).toBe(false);
    const bezahlt = transition(session, { type: 'ZAHLUNG_ERFOLGREICH' });
    expect(bezahlt.ok && bezahlt.session.status).toBe('ABGESCHLOSSEN');
  });

  it('verlangt in beiden Fällen eine bestätigte Telefonnummer', () => {
    const unbestaetigt: OnboardingSession = {
      ...imCheckout(HIMI_PRODUKT),
      customerContact: { email: null, telefon: '+491511234567', telefonVerifiziert: false },
    };
    expect(transition(unbestaetigt, { type: 'AUFTRAG_EINGEREICHT' }).ok).toBe(false);
  });
});
