import { erlaubteSupplyEvents, SUPPLY_STATUSES } from '@sanime/domain';
import { AKTIONEN, fristText, schritteFuer, seit, STATUS } from './fachtexte';

describe('schritteFuer', () => {
  it('bietet nur Übergänge an, die die gemeinsame Tabelle erlaubt', () => {
    for (const status of SUPPLY_STATUSES) {
      const { haupt, weitere } = schritteFuer(status);
      const erlaubt = erlaubteSupplyEvents(status);
      for (const ereignis of [haupt, ...weitere].filter(Boolean)) {
        expect(erlaubt).toContain(ereignis);
      }
    }
  });

  it('macht „Antrag versendet“ zum nächsten Schritt einer neuen Bestellung', () => {
    const { haupt, weitere } = schritteFuer('submitted');
    expect(haupt).toBe('AntragVersendet');
    expect(weitere).toEqual(expect.arrayContaining(['OhneGenehmigungFreigegeben', 'InsuranceApproved', 'InsuranceRejected']));
  });

  it('macht nie eine Ablehnung zur Hauptaktion', () => {
    for (const status of SUPPLY_STATUSES) {
      const { haupt } = schritteFuer(status);
      if (haupt) expect(AKTIONEN[haupt]?.gefahr).not.toBe(true);
    }
  });

  it('hat am Ende des Prozesses keine Aktion mehr', () => {
    expect(schritteFuer('archived')).toEqual({ haupt: null, weitere: [] });
  });

  it('hat für jeden Status einen deutschen Text', () => {
    for (const status of SUPPLY_STATUSES) expect(STATUS[status].label).toBeTruthy();
  });
});

describe('Zeittexte', () => {
  const jetzt = new Date('2026-10-28T12:00:00Z').getTime();

  it('beschreibt Fristen in Worten statt nur über Farbe', () => {
    expect(fristText('2026-11-02T12:00:00Z', jetzt)).toMatch(/^noch 5 Tage/);
    expect(fristText('2026-10-28T20:00:00Z', jetzt)).toMatch(/^morgen|^heute/);
    expect(fristText('2026-10-26T12:00:00Z', jetzt)).toMatch(/^seit 2 Tagen überfällig/);
  });

  it('nennt Wartezeiten', () => {
    expect(seit('2026-10-28T11:30:00Z', jetzt)).toBe('seit 30 Min.');
    expect(seit('2026-10-25T12:00:00Z', jetzt)).toBe('seit 3 Tagen');
  });
});
