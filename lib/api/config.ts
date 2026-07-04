import Constants from 'expo-constants';

export function resolveApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const url = fromExtra ?? fromEnv;
  if (!url) {
    throw new Error('API-Basis-URL fehlt — app.json "extra.apiUrl" oder EXPO_PUBLIC_API_URL setzen');
  }
  return url;
}
