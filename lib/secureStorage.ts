import * as SecureStore from 'expo-secure-store';

// Wrapper um expo-secure-store (iOS Keychain / Android Keystore) für Gesundheits-
// und Versicherungsdaten, die laut CLAUDE.md nie unverschlüsselt liegen dürfen.
// Android's Keystore-Backend begrenzt einzelne Werte auf ~2048 Bytes — deshalb hier
// nur für kleine, wirklich sensible Teilmengen verwenden (OCR-Ergebnis, Kontakt,
// Auth-Token/-Profil), nicht für die komplette, beliebig wachsende Session.
const ANDROID_VALUE_LIMIT_BYTES = 2048;

export async function setSecureJSON<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  if (__DEV__ && new TextEncoder().encode(json).length > ANDROID_VALUE_LIMIT_BYTES) {
    console.warn(`[secureStorage] "${key}" überschreitet ${ANDROID_VALUE_LIMIT_BYTES} Bytes — Risiko auf Android.`);
  }
  await SecureStore.setItemAsync(key, json);
}

export async function getSecureJSON<T>(key: string): Promise<T | null> {
  const json = await SecureStore.getItemAsync(key);
  return json ? (JSON.parse(json) as T) : null;
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
