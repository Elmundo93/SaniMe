import type { Versorgung } from '../types';
import { naechsterSchritt, notfallMoeglich, notfallText } from './versorgungsprozess';

const BASIS: Versorgung = {
  id: 'v1',
  status: 'PENDING_REVIEW',
  produkt: 'Rollator (Platzhalter)',
  hilfsmittelNr: '00.00.00.0001',
  arzt: 'Dr. Beispiel',
  krankenkasse: 'Beispiel-BKK',
  erstellt: '2026-10-01T10:00:00Z',
  aktualisiert: '2026-10-01T10:00:00Z',
  timeline: [],
  offeneAktionen: [],
  selbstzahler: false,
};

describe('naechsterSchritt', () => {
  it('sagt nach der Bestellung, dass wir den Antrag vorbereiten — ohne Aufgabe für den Kunden', () => {
    const schritt = naechsterSchritt(BASIS)!;
    expect(schritt.titel).toBe('Wir bereiten deinen Antrag vor');
    expect(schritt.aktion).toBeNull();
  });

  it('nennt nach dem Versand das Datum und die gesetzliche Frist', () => {
    const schritt = naechsterSchritt({ ...BASIS, status: 'PENDING_INSURANCE', antragVersendetAm: '2026-10-01T10:00:00Z' })!;
    expect(schritt.titel).toBe('Antrag am 1. Oktober 2026 gesendet');
    expect(schritt.text).toContain('spätestens bis 22. Oktober 2026');
    expect(schritt.text).toContain('bis zu 5 Wochen');
  });

  it('fordert nach der Genehmigung zur Terminwahl auf, danach zeigt er den Termin', () => {
    const genehmigt: Versorgung = {
      ...BASIS,
      status: 'APPROVED',
      entschiedenAm: '2026-10-10T10:00:00Z',
      offeneAktionen: [{ id: 'a', titel: 'Liefertermin wählen', beschreibung: '', typ: 'termin' }],
    };
    expect(naechsterSchritt(genehmigt)).toMatchObject({ titel: 'Genehmigt am 10. Oktober 2026', aktion: 'termin' });
    const mitTermin = { ...genehmigt, offeneAktionen: [], termin: { beginn: '2026-10-20T08:00:00Z', ende: '2026-10-20T10:00:00Z' } };
    expect(naechsterSchritt(mitTermin)).toMatchObject({ titel: 'Dein Liefertermin', aktion: null });
  });

  it('spricht bei Selbstzahlern nie von der Krankenkasse', () => {
    expect(naechsterSchritt({ ...BASIS, selbstzahler: true })!.text).not.toContain('Krankenkasse');
  });
});

describe('Notfalllieferung', () => {
  it('ist bis zur Lieferung und nur einmal möglich', () => {
    expect(notfallMoeglich(BASIS)).toBe(true);
    expect(notfallMoeglich({ ...BASIS, status: 'DELIVERED' })).toBe(false);
    const angefragt = { ...BASIS, notfall: { grund: 'STURZGEFAHR' as const, erreichbarkeit: 'VORMITTAG' as const, angefragtAm: '2026-10-02T10:00:00Z' } };
    expect(notfallMoeglich(angefragt)).toBe(false);
    expect(notfallText(angefragt)).toContain('vormittags');
  });
});
