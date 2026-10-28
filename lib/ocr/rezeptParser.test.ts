import { erkenneHinweise, parseRezept } from './rezeptParser';
import { wendeValidatorenAn } from './validatoren';

const HEUTE = new Date(2026, 6, 3); // 03.07.2026

describe('parseRezept', () => {
  it('extrahiert alle Felder aus einem vollständigen Muster-16-Rezept', () => {
    const zeilen = [
      'Muster 16',
      'Verordnung von Hilfsmitteln',
      'Techniker Krankenkasse',
      'Name, Vorname des Versicherten',
      'Mustermann, Max',
      'geb. 15.03.1972',
      'Dr. med. Sabine Müller',
      'Praxis für Allgemeinmedizin',
      'LANR 123456600',
      'BSNR 987654321',
      'Diagnose',
      'G82.1 Paraplegie schlaff',
      'Rollstuhl, faltbar, Sitzbreite 40 cm',
      '00.00.00',
      '15.06.2026',
    ];

    const felder = parseRezept(zeilen, HEUTE);

    // „Nachname, Vorname“ wird ins App-Format „Vorname Nachname“ gedreht.
    expect(felder.patientName.wert).toBe('Max Mustermann');
    expect(felder.patientGeburtsdatum.wert).toBe('15.03.1972');
    expect(felder.arztName.wert).toBe('Dr. med. Sabine Müller');
    expect(felder.arztLanr.wert).toBe('123456600');
    expect(felder.arztLanr.confidence).toBe('high');
    expect(felder.diagnose.wert).toBe('G82.1 — Paraplegie schlaff');
    expect(felder.diagnose.confidence).toBe('high');
    expect(felder.hilfsmittel.wert).toContain('Rollstuhl');
    expect(felder.hilfsmittelNr.wert).toBe('00.00.00');
    expect(felder.datum.wert).toBe('15.06.2026');
    expect(felder.datum.confidence).toBe('high');
  });

  it('liefert leere Felder mit low-Confidence statt zu werfen, wenn nichts erkannt wird', () => {
    const zeilen = ['Irgendein unleserlicher Text', 'ohne jede Struktur'];
    const felder = parseRezept(zeilen, HEUTE);

    expect(felder.patientName).toEqual({ wert: '', confidence: 'low' });
    expect(felder.patientGeburtsdatum).toEqual({ wert: '', confidence: 'low' });
    expect(felder.arztLanr).toEqual({ wert: '', confidence: 'low' });
    expect(felder.diagnose).toEqual({ wert: '', confidence: 'low' });
    expect(felder.hilfsmittelNr).toEqual({ wert: '', confidence: 'low' });
  });

  it('stuft das Geburtsdatum bei mehreren plausiblen Kandidaten auf medium ab', () => {
    const zeilen = ['geb. 15.03.1972', 'Ausgestellt am 20.03.1975', 'Rollstuhl'];
    const felder = parseRezept(zeilen, HEUTE);

    // Die früheste plausible Kandidatin gewinnt, aber Mehrdeutigkeit deckelt auf medium.
    expect(felder.patientGeburtsdatum.wert).toBe('15.03.1972');
    expect(felder.patientGeburtsdatum.confidence).toBe('medium');
  });

  it('disambiguiert LANR von BSNR über das Label', () => {
    const zeilen = ['BSNR 111111111', 'LANR 123456600'];
    const felder = parseRezept(zeilen, HEUTE);
    expect(felder.arztLanr.wert).toBe('123456600');
    expect(felder.arztLanr.confidence).toBe('high');
  });
});

// Synthetische Muster-16-Fälle in genau der Zeilenreihenfolge, die Apple
// Vision für echte Testfotos geliefert hat — Personendaten und Nummern sind
// erfunden (Nummern mit gültiger Prüfziffer). Echte Rezeptfotos gehören nie
// ins Repo (Gesundheitsdaten).
describe('parseRezept — Muster 16 über Feldbeschriftungen', () => {
  const STICHTAG = new Date(2026, 6, 10); // 10.07.2026

  // Flach fotografiert, daneben liegt ein Arztbrief mit fremder LANR.
  const SAUBER = [
    'Augenärztliche Gemeinschaftspraxis',
    'Musterstraße 1',
    'LANR 765432201 BS',
    'Apotheken-Nummer / IK',
    'Krankenkasse bzw. Kostenträger',
    'AOK Niedersachsen',
    'Name, Vorname des Versicherten',
    'Musterfrau',
    'Erika',
    'Beispielweg 7',
    'D',
    '12345',
    'Musterstadt',
    'Kostenträgerkennung',
    'Versicherten-Nr.',
    '101234569Q123456784',
    'Betriebsstätten-Nr.',
    'Arzt-Nr.',
    '990000200 123456699',
    '17',
    'BVG',
    'geb. am',
    '24.05.61',
    'Arzneimittel-/Hilfsmittel-Nr.',
    '1. Verordnung',
    'Status',
    '5000000',
    'Datum',
    '106.07.26',
    'aut',
    'idem',
    'Rp. (Bitte Leerräume durchstreichen)',
    '1x Rollator mit Sitzfläche und Korb, nach',
    'Genehmigung der GKV',
    'Diagnosen: M17.1 Gonarthrose, beidseitig,',
    'R26.8 Gangunsicherheit',
    'aut',
    'Sturzneigung',
    'dem',
    '655H*****',
    'Bei Arbeitsunfall',
    'Abgabedatum',
    'Vertragsarztstempel',
    '990000200',
    'Gemeinschaftspraxis',
    'Dr. med. Hans Beispiel und',
    'Angestellte',
    'Tel. 01234/5678',
  ];

  it('liest alle Felder des Personalienfelds und der Verordnung', () => {
    const felder = wendeValidatorenAn(parseRezept(SAUBER, STICHTAG));

    expect(felder.patientName).toEqual({ wert: 'Erika Musterfrau', confidence: 'high' });
    expect(felder.patientGeburtsdatum).toEqual({ wert: '24.05.1961', confidence: 'high' });
    expect(felder.datum.wert).toBe('06.07.2026');
    expect(felder.krankenkasseName).toEqual({ wert: 'AOK Niedersachsen', confidence: 'high' });
    expect(felder.ik).toEqual({ wert: '101234569', confidence: 'high' });
    expect(felder.versichertenNr).toEqual({ wert: 'Q123456784', confidence: 'high' });
    expect(felder.arztName.wert).toBe('Dr. med. Hans Beispiel');
    expect(felder.hilfsmittel.wert).toBe('1x Rollator mit Sitzfläche und Korb, nach Genehmigung der GKV');
    expect(felder.diagnose.wert).toBe('M17.1 Gonarthrose, beidseitig, R26.8 Gangunsicherheit Sturzneigung');
  });

  it('nimmt die LANR aus dem Arzt-Nr.-Feld, nicht die BSNR oder eine fremde LANR im Hintergrund', () => {
    const felder = wendeValidatorenAn(parseRezept(SAUBER, STICHTAG));
    expect(felder.arztLanr).toEqual({ wert: '123456699', confidence: 'high' });
  });

  it('hält ein Datum nicht für eine Hilfsmittelnummer', () => {
    expect(parseRezept(SAUBER, STICHTAG).hilfsmittelNr.wert).toBe('');
  });

  it('meldet bei einem frischen, nicht eingelösten Rezept keine Hinweise', () => {
    const felder = parseRezept(SAUBER, STICHTAG);
    expect(erkenneHinweise(SAUBER, felder, STICHTAG)).toEqual([]);
  });

  // Quer fotografiert, bereits in der Apotheke abgerechnet: Vision sortiert
  // den Abrechnungsaufdruck mitten in das Verordnungsfeld ein.
  const EINGELOEST = [
    'control',
    'Krankenkasse bzw. Kostenträger',
    'AOK Niedersachsen',
    'Name, Vorname des Versicherten',
    'Musterfrau',
    'Erika',
    'Beispielweg 7',
    'sonsto',
    'D 12345 Musterstadt',
    'Kostenträgerkennung',
    'Versicherten-Nr.',
    'Intal',
    '101234569Q123456784',
    'Betnebsstätten-Nr.',
    'Arzt-Nr.',
    '990000200',
    '123456699',
    'geb. am',
    '24.05.61',
    'Datum',
    '06.07.26',
    'Rp. (Bitte Leerräume durchstreichen)',
    '1x Rollator mit Sitzfläche und Korb, nach',
    'Genehmigung der GKV',
    'Rezept:12345678g.-',
    'BVG',
    'midl',
    'Apotheacn Nummer / 3',
    '300000001',
    'EA B50HLT',
    '01/1000000001',
    '19,90',
    'Faktor',
    'aut',
    'dem',
    'Diagnosen: M17.1 Gonarthrose, beidseitig,',
    'R26.8 Gangunsicherheit',
    '656*******',
    'Vertragsarztstempel',
    'Dr. med. Hans Beispiel und',
  ];

  it('lässt den Abrechnungsaufdruck der Apotheke aus der Verordnung heraus', () => {
    const felder = parseRezept(EINGELOEST, STICHTAG);
    expect(felder.hilfsmittel.wert).toBe('1x Rollator mit Sitzfläche und Korb, nach Genehmigung der GKV');
    expect(felder.diagnose.wert).toBe('M17.1 Gonarthrose, beidseitig, R26.8 Gangunsicherheit');
    expect(felder.arztLanr.wert).toBe('123456699');
    expect(felder.versichertenNr.wert).toBe('Q123456784');
  });

  it('erkennt ein bereits eingelöstes Rezept', () => {
    const felder = parseRezept(EINGELOEST, STICHTAG);
    expect(erkenneHinweise(EINGELOEST, felder, STICHTAG)).toEqual(['BEREITS_EINGELOEST']);
  });

  it('weist auf ein Rezept hin, das älter als 28 Tage ist', () => {
    const spaeter = new Date(2026, 9, 28);
    const felder = parseRezept(SAUBER, spaeter);
    expect(erkenneHinweise(SAUBER, felder, spaeter)).toEqual(['AELTER_ALS_28_TAGE']);
  });

  // Reihenfolge der iOS-Texterkennung (Simulator) für dasselbe Foto: die
  // rechte Spalte „geb. am“ landet zwischen Nach- und Vorname, BSNR und LANR
  // werden ohne Leerraum gelesen.
  const IOS_REIHENFOLGE = [
    'Krankenkasse bzw. Kostenträger',
    '17',
    'AOK Niedersachsen',
    'Name, Vorname des Versicherten',
    'Musterfrau',
    'geb. am',
    '24.05.61',
    'Erika',
    'Beispielweg 7',
    'D',
    '12345',
    'Kostenträgerkennung',
    'Versicherten-Nr.',
    '101234569Q123456784',
    'Betriebsstätten-Nr.',
    'Arzt-Nr.',
    '990000200123456699',
    'Status',
    '15000000',
    'Datum',
    '06.07.26',
    'Rp. (Bitte Leerräume durchstreichen)',
    '1x Rollator mit Sitzfläche und Korb, nach',
    'Genehmigung der GKV',
  ];

  it('liest Name und LANR auch in der Zeilenreihenfolge der iOS-Texterkennung', () => {
    const felder = wendeValidatorenAn(parseRezept(IOS_REIHENFOLGE, STICHTAG));
    expect(felder.patientName).toEqual({ wert: 'Erika Musterfrau', confidence: 'high' });
    expect(felder.patientGeburtsdatum.wert).toBe('24.05.1961');
    expect(felder.arztLanr).toEqual({ wert: '123456699', confidence: 'high' });
    expect(felder.datum.wert).toBe('06.07.2026');
  });

  it('stuft eine Versichertennummer mit falscher Prüfziffer auf low herab', () => {
    const zeilen = SAUBER.map((z) => (z === '101234569Q123456784' ? '101234569Q123456785' : z));
    expect(wendeValidatorenAn(parseRezept(zeilen, STICHTAG)).versichertenNr.confidence).toBe('low');
  });
});
