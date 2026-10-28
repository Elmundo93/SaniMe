// Einziger Netzwerkzugang der Admin-App. Die Sitzung steckt in einem
// httpOnly-Cookie (kein Token in JavaScript/localStorage); jede Anfrage
// schickt den CSRF-Header, den das Backend für Schreibzugriffe verlangt.

export class ApiFehler extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiFehler';
  }
}

const BASIS = '/api/v1';

// Für den Inaktivitäts-Hinweis: Jede erfolgreiche Anfrage verlängert die
// Sitzung auf dem Server (gleitendes Ablaufdatum), also merken wir uns den Zeitpunkt.
let letzteAntwort = Date.now();
const abgemeldetBeobachter = new Set<() => void>();

export function zeitDerLetztenAntwort() {
  return letzteAntwort;
}

export function beiAbmeldung(beobachter: () => void) {
  abgemeldetBeobachter.add(beobachter);
  return () => {
    abgemeldetBeobachter.delete(beobachter);
  };
}

function verstaendlicheMeldung(status: number, serverMeldung: string | undefined): string {
  if (status === 401) return serverMeldung && serverMeldung !== 'Unauthorized' ? serverMeldung : 'Bitte melde dich erneut an.';
  if (status === 403 && (!serverMeldung || serverMeldung.startsWith('Fehlende Berechtigung'))) {
    return 'Dafür fehlt dir die Berechtigung. Bitte wende dich an die Teamleitung.';
  }
  if (status >= 500 || !serverMeldung) {
    return 'Da ist etwas schiefgelaufen. Bitte versuche es noch einmal. Wenn es wieder passiert, melde dich bei der Technik.';
  }
  return serverMeldung;
}

interface Optionen {
  methode?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  // Login-Schritte: ein 401 heißt dort „falsche Daten“, nicht „Sitzung weg“.
  ohneAbmeldung?: boolean;
}

export async function anfrage<T>(pfad: string, { methode = 'GET', body, ohneAbmeldung = false }: Optionen = {}): Promise<T> {
  let antwort: Response;
  try {
    antwort = await fetch(`${BASIS}${pfad}`, {
      method: methode,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'X-SaniMe-Admin': '1',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiFehler(0, 'Keine Verbindung zum Server. Bitte prüfe die Internetverbindung und versuche es erneut.');
  }

  if (!antwort.ok) {
    let serverMeldung: string | undefined;
    try {
      serverMeldung = ((await antwort.json()) as { message?: string }).message;
    } catch {
      serverMeldung = undefined;
    }
    if (antwort.status === 401 && !ohneAbmeldung) {
      abgemeldetBeobachter.forEach((beobachter) => beobachter());
    }
    throw new ApiFehler(antwort.status, verstaendlicheMeldung(antwort.status, serverMeldung));
  }

  letzteAntwort = Date.now();
  if (antwort.status === 204) return undefined as T;
  return (await antwort.json()) as T;
}
