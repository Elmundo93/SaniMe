// Eindeutige Mobilnummer je Aufruf — die Sendegrenzen der Telefonbestätigung
// (3 Codes/Stunde, 30 s Abstand) gelten je Nummer, und die Testdatenbank
// bleibt zwischen Läufen bestehen. Die Worker-Nummer trennt parallel laufende
// Testdateien — sonst erzeugten zwei Dateien in derselben Millisekunde mit
// demselben Zählerstand dieselbe Nummer und liefen in die Sendegrenze.
let zaehler = 0;

export function testTelefon(): string {
  zaehler += 1;
  const worker = Number(process.env.JEST_WORKER_ID ?? 1) % 10;
  return `+49151${worker}${String(Date.now()).slice(-5)}${String(zaehler).padStart(2, '0')}`;
}
