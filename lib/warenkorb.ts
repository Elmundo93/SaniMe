import type { WarenkorbArtikel, WarenkorbPosition } from '@sanime/domain';

// Lokaler Warenkorb (Gerät) und Positionen der Bestellung (Server) sollen
// dasselbe zeigen. Der lokale Warenkorb ist führend — mit zwei Ausnahmen, damit
// nie etwas stillschweigend verloren geht: ist er leer (z. B. nach einem
// Neustart mitten in der Bestellung), gilt der Stand des Servers; und eine
// Position, für die schon ein Rezept erfasst ist (z. B. Rezept zuerst gewählt),
// bleibt erhalten, auch wenn sie lokal fehlt.
/** Eine Position der Bestellung als Warenkorb-Artikel (mit gewählter Größe). */
export function alsArtikel(p: WarenkorbPosition): WarenkorbArtikel {
  return {
    produktId: p.produkt.id,
    ...(p.krankheitsbildId ? { krankheitsbildId: p.krankheitsbildId } : {}),
    ...(p.variante ? { varianteId: p.variante.id } : {}),
  };
}

export function warenkorbAbgleich(lokal: WarenkorbArtikel[], positionen: WarenkorbPosition[]): WarenkorbArtikel[] {
  const ausServer = alsArtikel;
  if (lokal.length === 0) return positionen.map(ausServer);
  const fehlendMitRezept = positionen.filter((p) => p.rezept && !lokal.some((a) => a.produktId === p.produkt.id));
  return [...lokal, ...fehlendMitRezept.map(ausServer)];
}

/** Gleiche Produkte in gleicher Reihenfolge und mit gleicher Größe/Ausführung. */
export function gleicheProdukte(a: WarenkorbArtikel[], b: WarenkorbArtikel[]): boolean {
  return (
    a.length === b.length &&
    a.every((x, i) => x.produktId === b[i].produktId && (x.varianteId ?? null) === (b[i].varianteId ?? null))
  );
}
