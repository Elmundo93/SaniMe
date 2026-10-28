import type { SupplyEvent } from '@sanime/domain';

export type AktionsZielgruppe = 'intern' | 'kunde';

export interface OffeneAktionVorlage {
  title: string;
  description: string;
  actionType: string;
  audience: AktionsZielgruppe;
}

// actionType 'schritt' = interne Aufgabe, die zu genau einem Prozessschritt
// gehört — sie erledigt sich mit dem nächsten Statuswechsel von selbst
// (SupplyOrderService.applyTransitionInner). Alles andere (z. B. der Rückruf
// einer Notfalllieferung, die Terminwahl des Kunden) wird gezielt erledigt.
export const SCHRITT_AKTION = 'schritt';

// Was nach einem Ereignis zu tun ist — und für wen. Der Kunde sieht nur
// 'kunde'-Aufgaben; Antrag, Lieferant, Übergabe sind unser Job.
export const OPEN_ACTIONS_META: Partial<Record<SupplyEvent['type'], OffeneAktionVorlage[]>> = {
  Submitted: [
    {
      title: 'Antrag an die Krankenkasse senden',
      description: 'Kostenvoranschlag mit Rezept an die Krankenkasse übermitteln, danach „Antrag versendet“ setzen.',
      actionType: SCHRITT_AKTION,
      audience: 'intern',
    },
  ],
  AntragVersendet: [
    {
      title: 'Antwort der Krankenkasse nachhalten',
      description: 'Gesetzliche Frist: drei Wochen, mit Gutachten des Medizinischen Dienstes fünf Wochen.',
      actionType: SCHRITT_AKTION,
      audience: 'intern',
    },
  ],
  InsuranceApproved: [
    {
      title: 'Lieferant wählen',
      description: 'Lieferanten für die genehmigte Versorgung auswählen.',
      actionType: SCHRITT_AKTION,
      audience: 'intern',
    },
    {
      title: 'Liefertermin wählen',
      description: 'Deine Krankenkasse hat zugestimmt. Wähle jetzt einen Termin für die Lieferung.',
      actionType: 'termin',
      audience: 'kunde',
    },
  ],
  OhneGenehmigungFreigegeben: [
    {
      title: 'Lieferant wählen',
      description: 'Selbstzahler-Versorgung: Lieferanten auswählen und Lieferung vorbereiten.',
      actionType: SCHRITT_AKTION,
      audience: 'intern',
    },
  ],
  InsuranceRejected: [
    {
      title: 'Ablehnung prüfen',
      description: 'Ablehnung der Krankenkasse prüfen, Kunden anrufen und nächste Schritte klären (Widerspruch, Alternative).',
      actionType: SCHRITT_AKTION,
      audience: 'intern',
    },
  ],
  Ordered: [
    {
      title: 'Termin koordinieren',
      description: 'Liefer-/Anpassungstermin mit dem Kunden abstimmen bzw. den gewählten Termin bestätigen.',
      actionType: SCHRITT_AKTION,
      audience: 'intern',
    },
  ],
  Delivered: [
    {
      title: 'Übergabe bestätigen',
      description: 'Übergabebestätigung mit dem Kunden abschließen.',
      actionType: SCHRITT_AKTION,
      audience: 'intern',
    },
  ],
};

// Push an den Kunden bei Ereignissen, die er wissen will. Sperrbildschirm-
// tauglich: kein Produkt, keine Kasse, keine Diagnose.
export const KUNDEN_NACHRICHTEN: Partial<Record<SupplyEvent['type'], { title: string; body: string }>> = {
  AntragVersendet: {
    title: 'Antrag versendet',
    body: 'Wir haben deinen Antrag an die Krankenkasse geschickt. Wir melden uns, sobald sie entschieden hat.',
  },
  InsuranceApproved: {
    title: 'Versorgung genehmigt',
    body: 'Gute Nachricht: Deine Krankenkasse hat deine Versorgung genehmigt. Wähle jetzt deinen Liefertermin.',
  },
  InsuranceRejected: {
    title: 'Neuigkeiten zu deiner Versorgung',
    body: 'Deine Krankenkasse hat entschieden. Wir rufen dich an, um die nächsten Schritte zu besprechen.',
  },
};
