// Aktuelle Fassungen der Rechtstexte — in der Domain (nicht nur in der App),
// weil die dauerhafte Einwilligung (Katalogplan §2.3) auf beiden Seiten gegen
// dieselben Versionen geprüft wird: eine früher erteilte Einwilligung darf nur
// übernommen werden, solange sie genau diesen Fassungen gilt. Bei Änderung der
// Texte hochzählen — dann wird automatisch wieder gefragt.
// constants/legal.ts re-exportiert beide für die App.
export const AGB_VERSION = '2026-07-01';
export const DATENSCHUTZ_VERSION = '2026-07-01';

export function einwilligungAktuell(versionen: { agbVersion: string; datenschutzVersion: string }): boolean {
  return versionen.agbVersion === AGB_VERSION && versionen.datenschutzVersion === DATENSCHUTZ_VERSION;
}
