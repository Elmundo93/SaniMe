import type { Aufgabe, VersorgungsDetail } from '../api/admin';

const vorStunden = (stunden: number) => new Date(Date.now() - stunden * 3_600_000).toISOString();

export function aufgabe(teil: Partial<Aufgabe>): Aufgabe {
  return {
    id: 'auf-1',
    supplyId: 'sup-1',
    orderId: 'ord-1',
    title: 'Antrag an die Krankenkasse senden',
    description: 'Kostenvoranschlag mit Rezept übermitteln.',
    actionType: 'schritt',
    createdAt: vorStunden(5),
    assignedAdminId: null,
    assignedAdminName: null,
    assignedAdminEmail: null,
    supplyStatus: 'submitted',
    kundeName: 'Erika Muster',
    produktName: 'Rollator (Platzhalter)',
    kasse: 'Beispiel-BKK',
    insuranceSubmittedAt: null,
    dringlichkeit: 'neu',
    fristBis: null,
    ...teil,
  };
}

// Erfundene Beispieldaten — nie echte Rezeptinhalte in Tests.
export function detail(teil: Partial<VersorgungsDetail> = {}, supply: Partial<VersorgungsDetail['supply']> = {}): VersorgungsDetail {
  return {
    order: { id: 'ord-1', status: 'submitted', createdAt: vorStunden(30) },
    supply: {
      id: 'sup-1',
      status: 'submitted',
      productNameSnapshot: 'Rollator (Platzhalter)',
      variantLabelSnapshot: null,
      manufacturerNameSnapshot: 'Beispiel GmbH',
      hilfsmittelNrSnapshot: '00.00.00.0001',
      doctorNameSnapshot: 'Dr. Beispiel',
      insurerNameSnapshot: 'Beispiel-BKK',
      customerCopaySnapshotCents: 1000,
      deliveryTimeLabelSnapshot: '3–5 Werktage',
      insuranceSubmittedAt: null,
      insuranceDecidedAt: null,
      createdAt: vorStunden(30),
      timeline: [
        { id: 't1', label: 'Bestellung eingegangen', description: 'Wir prüfen deine Unterlagen.', occurredAt: vorStunden(30), createdAt: vorStunden(30), source: 'system' },
      ],
      ...supply,
    },
    notes: [{ id: 'n1', body: 'Kundin bittet um Anruf am Vormittag.', createdAt: vorStunden(2), authorAdminId: 'a2', autor: 'Ben Team' }],
    appointment: null,
    kunde: {
      id: 'k1',
      vorname: 'Erika',
      nachname: 'Muster',
      telefon: '0151 0000000',
      email: 'erika@example.com',
      versichertennummer: 'A000000000',
      geburtsdatum: null,
    },
    lieferadresse: { strasse: 'Musterweg 1', plz: '12345', ort: 'Musterstadt' },
    rezept: {
      patientName: 'Erika Muster',
      patientGeburtsdatum: '01.01.1950',
      strasse: 'Musterweg 1',
      plz: '12345',
      ort: 'Musterstadt',
      arzt: 'Dr. Beispiel',
      lanr: null,
      diagnose: 'Beispieldiagnose',
      hilfsmittel: 'Rollator',
      hilfsmittelNr: null,
      ausstellungsdatum: '01.10.2026',
      vomKundenKorrigiert: false,
    },
    lieferant: null,
    aufgaben: [
      {
        id: 'auf-1',
        title: 'Antrag an die Krankenkasse senden',
        description: 'Kostenvoranschlag mit Rezept übermitteln.',
        actionType: 'schritt',
        audience: 'intern',
        createdAt: vorStunden(30),
        assignedAdminId: null,
        assignedAdminName: null,
      },
    ],
    notfall: null,
    fristBis: null,
    ...teil,
  };
}
