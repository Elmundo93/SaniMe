import { ERREICHBARKEITEN, erwarteteAntwortBis, GENEHMIGUNGSFRIST_MIT_GUTACHTEN_TAGE } from '@sanime/domain';
import type { Versorgung } from '../types';

// „Wie geht es weiter?“ einer Versorgung — ein Satz zum Stand, was als
// Nächstes passiert und ob der Kunde selbst etwas tun kann. Nach der
// Bestellung ist der Antrag an die Krankenkasse unser Job, nicht seiner.
export interface NaechsterSchritt {
  titel: string;
  text: string;
  aktion: 'termin' | null;
}

export function datumLang(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function terminText(termin: { beginn: string; ende: string }): string {
  const beginn = new Date(termin.beginn);
  const ende = new Date(termin.ende);
  const tag = beginn.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const uhr = (d: Date) => d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${tag}, ${uhr(beginn)}–${uhr(ende)} Uhr`;
}

function kasse(v: Versorgung): string {
  return v.krankenkasse || 'deine Krankenkasse';
}

export function naechsterSchritt(v: Versorgung): NaechsterSchritt | null {
  const terminOffen = v.offeneAktionen.some((a) => a.typ === 'termin');
  switch (v.status) {
    case 'PENDING_REVIEW':
      return v.selbstzahler
        ? { titel: 'Bestellung eingegangen', text: 'Wir bereiten deine Lieferung vor. Du musst nichts weiter tun.', aktion: null }
        : {
            titel: 'Wir bereiten deinen Antrag vor',
            text: `Wir prüfen dein Rezept und schicken den Antrag an ${kasse(v)}. Du musst nichts weiter tun — wir melden uns, sobald er raus ist.`,
            aktion: null,
          };
    case 'PENDING_INSURANCE': {
      const seit = v.antragVersendetAm ? ` am ${datumLang(v.antragVersendetAm)}` : '';
      const bis = v.antragVersendetAm ? ` — spätestens bis ${datumLang(erwarteteAntwortBis(v.antragVersendetAm).toISOString())}` : '';
      return {
        titel: `Antrag${seit} gesendet`,
        text:
          `${kasse(v)} entscheidet in der Regel innerhalb von drei Wochen${bis}. ` +
          `Braucht sie ein Gutachten des Medizinischen Dienstes, sind es bis zu ${GENEHMIGUNGSFRIST_MIT_GUTACHTEN_TAGE / 7} Wochen. ` +
          'Wir benachrichtigen dich, sobald die Antwort da ist.',
        aktion: null,
      };
    }
    case 'APPROVED':
    case 'PROCESSING':
    case 'SHIPPED':
      if (v.termin) {
        return { titel: 'Dein Liefertermin', text: `Wir kommen am ${terminText(v.termin)}.`, aktion: null };
      }
      if (terminOffen) {
        const am = v.entschiedenAm ? ` am ${datumLang(v.entschiedenAm)}` : '';
        return {
          titel: v.selbstzahler ? 'Freigegeben' : `Genehmigt${am}`,
          text: v.selbstzahler
            ? 'Wähle jetzt einen Termin für die Lieferung.'
            : `Gute Nachricht: ${kasse(v)} hat zugestimmt. Wähle jetzt einen Termin für die Lieferung.`,
          aktion: 'termin',
        };
      }
      return { titel: 'Wird vorbereitet', text: 'Wir bereiten deine Lieferung vor und melden uns mit dem Termin.', aktion: null };
    case 'REJECTED':
      return {
        titel: 'Die Krankenkasse hat abgelehnt',
        text: 'Wir rufen dich an und besprechen mit dir, wie es weitergeht — zum Beispiel mit einem Widerspruch.',
        aktion: null,
      };
    default:
      return null;
  }
}

// Notfalllieferung ist möglich, bis geliefert oder abgelehnt wurde — und nur
// einmal (danach „Wir rufen dich an“).
export function notfallMoeglich(v: Versorgung): boolean {
  return !v.notfall && ['PENDING_REVIEW', 'PENDING_INSURANCE', 'APPROVED', 'PROCESSING'].includes(v.status);
}

export function notfallText(v: Versorgung): string | null {
  if (!v.notfall) return null;
  return `Du hast eine Notfalllieferung angefragt. Wir rufen dich an (${ERREICHBARKEITEN[v.notfall.erreichbarkeit].toLowerCase()}) und klären, wie wir dich schneller versorgen können.`;
}
