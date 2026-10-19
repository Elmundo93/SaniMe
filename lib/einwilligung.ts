import { deleteSecureItem, getSecureJSON, setSecureJSON } from './secureStorage';
import * as onboardingApi from './api/onboarding';

// Dauerhafte Einwilligung (Katalogplan §2.3): der Server gibt nach der ersten
// vollständigen Zustimmung einmalig einen Token heraus, der AUSSCHLIESSLICH
// zur Übernahme dieser Einwilligung in künftige Sessions berechtigt. Er liegt
// verschlüsselt im SecureStore — kein Session-Secret, öffnet keine Daten.
const TOKEN_KEY = 'sanime_einwilligungs_token';

export async function ladeEinwilligungsToken(): Promise<string | null> {
  try {
    return await getSecureJSON<string>(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function speichereEinwilligungsToken(token: string): Promise<void> {
  try {
    await setSecureJSON(TOKEN_KEY, token);
  } catch (e) {
    // Ohne gespeicherten Token fragt die App beim nächsten Mal einfach wieder —
    // kein Grund, den laufenden Ablauf zu blockieren.
    if (__DEV__) console.warn('[einwilligung] Token konnte nicht gespeichert werden', e);
  }
}

export async function vergesseEinwilligungsToken(): Promise<void> {
  try {
    await deleteSecureItem(TOKEN_KEY);
  } catch {
    // Nichts gespeichert — nichts zu tun.
  }
}

/** Widerruf in den Einstellungen: serverseitig widerrufen, dann lokal löschen.
 * Wirft bei Netzwerkfehlern, damit der Screen eine konkrete Meldung zeigen kann —
 * ein lokal gelöschter, serverseitig aber gültiger Token wäre kein echter Widerruf. */
export async function einwilligungWiderrufen(): Promise<void> {
  const token = await ladeEinwilligungsToken();
  if (token) await onboardingApi.einwilligungWiderrufen(token);
  await vergesseEinwilligungsToken();
}
