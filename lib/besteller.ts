function normNr(nr: string | null | undefined): string {
  return (nr ?? '').replace(/\s+/g, '').toUpperCase();
}

// Erkannter Nutzer, der für sich selbst bestellt (gleiche oder fehlende
// Versichertennummer) — nur dann entfällt die Telefonbestätigung an der Kasse.
// Für eine andere Person ist sie Pflicht. Spiegelt die Server-Regel
// CustomersService.istBekannterBesteller, die das auch durchsetzt.
export function bestelltFuerSichSelbst(erkannt: boolean, gespeichert: string | undefined, bestellung: string | undefined): boolean {
  if (!erkannt) return false;
  return !normNr(bestellung) || !normNr(gespeichert) || normNr(gespeichert) === normNr(bestellung);
}
