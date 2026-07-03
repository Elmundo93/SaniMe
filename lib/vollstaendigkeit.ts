import type { Benutzer } from '../types';

export interface ProfilVollstaendigkeit {
  profil: number;
  krankenkasse: number;
  lieferung: number;
  gesamt: number;
}

function zaehleLeere(werte: (string | undefined | null)[]): number {
  return werte.filter((w) => !w || w.trim() === '').length;
}

export function berechneProfilVollstaendigkeit(benutzer: Benutzer | null): ProfilVollstaendigkeit {
  const profil = zaehleLeere([benutzer?.vorname, benutzer?.nachname, benutzer?.telefon, benutzer?.email]);
  const krankenkasse = zaehleLeere([benutzer?.krankenkasse, benutzer?.versichertenNr]);
  const lieferung = zaehleLeere([
    benutzer?.lieferadresse?.strasse,
    benutzer?.lieferadresse?.plz,
    benutzer?.lieferadresse?.ort,
  ]);
  return { profil, krankenkasse, lieferung, gesamt: profil + krankenkasse + lieferung };
}
