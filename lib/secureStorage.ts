import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Wrapper um expo-secure-store (iOS Keychain / Android Keystore) für Gesundheits-
// und Versicherungsdaten, die laut CLAUDE.md nie unverschlüsselt liegen dürfen.
// Android's Keystore-Backend begrenzt einzelne Werte auf ~2048 Bytes — deshalb hier
// nur für kleine, wirklich sensible Teilmengen verwenden (OCR-Ergebnis, Kontakt,
// Auth-Token/-Profil), nicht für die komplette, beliebig wachsende Session.
const ANDROID_VALUE_LIMIT_BYTES = 2048;

// Jeder Schlüssel, den die App im SecureStore ablegt. Der Schlüsselbund lässt
// sich nicht aufzählen — nur über diese Liste kann die App nach einer
// Neuinstallation alles löschen. Die Funktionen unten akzeptieren nur diese
// Schlüssel, ein neuer fällt also schon beim Typecheck auf.
export const SECURE_KEYS = [
  'sanime_token',
  'sanime_benutzer',
  'sanime_profil_vorab',
  'sanime_einwilligungs_token',
  'sanime_onboarding_sensitive',
  'sanime_warenkorb',
  'sanime_merkliste',
] as const;

export type SecureKey = (typeof SECURE_KEYS)[number];

const INSTALLATIONS_MARKER = 'sanime_installiert';

/** iOS behält Schlüsselbund-Einträge, wenn die App gelöscht wird — nach einer
 * Neuinstallation wären Token, Profil, Warenkorb (Gesundheitsdaten) und
 * Einwilligung wieder da, auch auf einem weitergegebenen Gerät. Fehlt beim
 * Start jede AsyncStorage-Spur (die mit der App gelöscht wird), ist sie neu
 * installiert: dann den Schlüsselbund leeren. Eine bestehende Installation
 * (andere sanime_*-Einträge vorhanden) bekommt nur den Marker. Vor allen
 * Stores aufrufen. */
export async function schluesselbundNachNeuinstallationLeeren(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(INSTALLATIONS_MARKER)) return;
    const bestehend = (await AsyncStorage.getAllKeys()).some((k) => k.startsWith('sanime_'));
    if (!bestehend) {
      await Promise.all(SECURE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)));
    }
    await AsyncStorage.setItem(INSTALLATIONS_MARKER, '1');
  } catch (e) {
    if (__DEV__) console.warn('[secureStorage] Prüfung auf Neuinstallation fehlgeschlagen', e);
  }
}

export async function setSecureJSON<T>(key: SecureKey, value: T): Promise<void> {
  const json = JSON.stringify(value);
  if (__DEV__ && new TextEncoder().encode(json).length > ANDROID_VALUE_LIMIT_BYTES) {
    console.warn(`[secureStorage] "${key}" überschreitet ${ANDROID_VALUE_LIMIT_BYTES} Bytes — Risiko auf Android.`);
  }
  await SecureStore.setItemAsync(key, json);
}

export async function getSecureJSON<T>(key: SecureKey): Promise<T | null> {
  const json = await SecureStore.getItemAsync(key);
  return json ? (JSON.parse(json) as T) : null;
}

export async function deleteSecureItem(key: SecureKey): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
