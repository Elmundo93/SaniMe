import type { WarenkorbArtikel, WarenkorbPosition } from '@sanime/domain';

// Lokaler Warenkorb (Gerät) und Positionen der Bestellung (Server) sollen
// dasselbe zeigen. Der lokale Warenkorb ist führend — mit zwei Ausnahmen, damit
// nie etwas stillschweigend verloren geht: ist er leer (z. B. nach einem
// Neustart mitten in der Bestellung), gilt der Stand des Servers; und eine
// Position, für die schon ein Rezept erfasst ist (z. B. Rezept zuerst gewählt),
// bleibt erhalten, auch wenn sie lokal fehlt.
export function warenkorbAbgleich(lokal: WarenkorbArtikel[], positionen: WarenkorbPosition[]): WarenkorbArtikel[] {
  const ausServer = (p: WarenkorbPosition): WarenkorbArtikel => ({
    produktId: p.produkt.id,
    ...(p.krankheitsbildId ? { krankheitsbildId: p.krankheitsbildId } : {}),
  });
  if (lokal.length === 0) return positionen.map(ausServer);
  const fehlendMitRezept = positionen.filter((p) => p.rezept && !lokal.some((a) => a.produktId === p.produkt.id));
  return [...lokal, ...fehlendMitRezept.map(ausServer)];
}

export function gleicheProdukte(a: { produktId: string }[], b: { produktId: string }[]): boolean {
  return a.length === b.length && a.every((x, i) => x.produktId === b[i].produktId);
}
