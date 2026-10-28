// Mobilnummern für die Telefonbestätigung: App (Eingabeprüfung) und Backend
// (Versand, Speicherung) normalisieren identisch auf E.164, damit „0151 …“,
// „+49 151 …“ und „0049151…“ dieselbe Nummer sind — sonst griffen weder die
// Sendegrenzen noch der Abgleich des Codes.

// Deutsche Mobilfunk-Vorwahlen: 015x, 016x, 017x.
const DEUTSCHE_MOBILNUMMER = /^\+491[567]\d{7,10}$/;

export function normalisiereMobilnummer(eingabe: string): string | null {
  let nummer = eingabe.replace(/[\s\-/().]/g, '');
  if (nummer.startsWith('00')) nummer = `+${nummer.slice(2)}`;
  else if (nummer.startsWith('0')) nummer = `+49${nummer.slice(1)}`;
  else if (nummer.startsWith('49')) nummer = `+${nummer}`;
  return DEUTSCHE_MOBILNUMMER.test(nummer) ? nummer : null;
}

export const MOBILNUMMER_FEHLER = 'Bitte gib eine deutsche Mobilnummer an (z. B. 0151 23456789) — dorthin schicken wir den Code per SMS.';

// Wartezeit, bevor ein neuer Code angefordert werden darf (App-Countdown und
// Server-Grenze nutzen denselben Wert).
export const CODE_ERNEUT_SENDEN_SEKUNDEN = 30;
