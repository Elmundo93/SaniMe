// Stille Telefonbestätigung: die App ruft die check_url von Telekom Verify auf.
// Der Netzbetreiber erkennt die SIM an der Mobilfunkverbindung, die Antwort
// (nach Weiterleitungen) enthält request_id und Code — ganz ohne SMS.
//
// Mit dem nativen Modul (modules/mobilfunk-anfrage, iOS) läuft die Anfrage
// auch bei aktivem WLAN über Mobilfunk. Ohne Modul (älterer Build, Android)
// nimmt fetch die aktive Verbindung — im WLAN scheitert die Prüfung dann und
// es geht per SMS weiter.
import { mobilfunkAnfrage } from '../modules/mobilfunk-anfrage';

const ZEITLIMIT_MS = 8000;

function codeAus(text: string): string | null {
  try {
    const body = JSON.parse(text) as { code?: unknown };
    return typeof body.code === 'string' && body.code.length >= 4 ? body.code : null;
  } catch {
    return null;
  }
}

export async function stillePruefen(checkUrl: string): Promise<string | null> {
  if (mobilfunkAnfrage) {
    try {
      const { status, body } = await mobilfunkAnfrage.get(checkUrl);
      return status >= 200 && status < 300 ? codeAus(body) : null;
    } catch {
      return null; // kein Mobilfunk, Zeitüberschreitung, Netzbetreiber lehnt ab
    }
  }
  const abbruch = new AbortController();
  const timer = setTimeout(() => abbruch.abort(), ZEITLIMIT_MS);
  try {
    const res = await fetch(checkUrl, { signal: abbruch.signal });
    if (!res.ok) return null;
    return codeAus(await res.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Vorgeschriebener Wortlaut der deutschen Netzbetreiber, vor der Übermittlung
// der Nummer anzuzeigen ([Button] = Beschriftung des Knopfs).
export function einwilligungStillePruefung(button: string): string {
  return (
    `Beim Klick auf „${button}“ sind Sie damit einverstanden, dass Ihre Mobilfunknummer an Ihren Mobilfunkanbieter ` +
    'für einen Abgleich übermittelt wird. Ferner sind Sie damit einverstanden, dass Ihr Mobilfunkanbieter Ihr Gerät ' +
    'zusätzlich mit Ihrer IP-Adresse verifiziert.'
  );
}
