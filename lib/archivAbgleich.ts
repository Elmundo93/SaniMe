import { useAuthStore } from '../store/authStore';
import * as authApi from './api/auth';
import { ApiError } from './api/client';

// Prüft die Versichertennummer gegen den echten Kundenstamm
// (POST /customers/match). Bei einem Treffer claimt der Server die AKTUELLE
// Session auf diesen Kunden (dasselbe Bearer-Session-Secret bleibt gültig),
// und die App übernimmt die Identität nur für die Anzeige — der einzige Weg,
// auf dem ein früherer Kunde ohne Login wiedererkannt wird. Ein Treffer identifiziert
// nur den Kunden, er beendet nicht die laufende Bestellung. Ist bereits ein
// benutzer eingeloggt (Folgeauftrag), bleibt dessen Identität unangetastet.
// Die Nummer kommt von der eGK oder aus dem Personalienfeld des Rezepts.
export async function pruefeArchivTreffer(versichertenNr: string): Promise<boolean> {
  const { benutzer, token, setBenutzer } = useAuthStore.getState();
  if (benutzer || !versichertenNr) return false;
  try {
    const { customer } = await authApi.matchByInsuredNumber(versichertenNr);
    await setBenutzer(
      {
        id: customer.id,
        vorname: customer.firstName,
        nachname: customer.lastName,
        email: customer.email ?? undefined,
        telefon: customer.phone ?? '',
        versichertenNr: customer.insuredNumber,
      },
      token!,
    );
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false; // kein Archiv-Treffer
    throw error;
  }
}
