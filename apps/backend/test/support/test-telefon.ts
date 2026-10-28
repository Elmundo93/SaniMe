// Eindeutige Mobilnummer je Aufruf — die Sendegrenzen der Telefonbestätigung
// (3 Codes/Stunde, 30 s Abstand) gelten je Nummer, und die Testdatenbank
// bleibt zwischen Läufen bestehen.
let zaehler = 0;

export function testTelefon(): string {
  zaehler += 1;
  return `+49151${String(Date.now()).slice(-6)}${String(zaehler).padStart(2, '0')}`;
}
