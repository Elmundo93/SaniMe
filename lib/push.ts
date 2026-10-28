import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { useRouter } from 'expo-router';
import { request } from './api/client';
import { useVersorgungStore } from '../store/versorgungStore';

type PushModul = typeof import('expo-notifications');

// Wie die Spracheingabe: ein Dev-Client ohne expo-notifications darf nicht
// beim Laden abstürzen — dann gibt es eben keine Push-Nachrichten.
function ladePushModul(): PushModul | null {
  if (!requireOptionalNativeModule('ExpoPushTokenManager')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as PushModul;
  } catch {
    return null;
  }
}

const push = ladePushModul();

// Direkt das APNs-/FCM-Gerätetoken (kein Expo-Push-Dienst dazwischen, siehe
// ApnsNotificationProvider im Backend).
async function geraeteToken(): Promise<string | null> {
  if (!push) return null;
  try {
    return String((await push.getDevicePushTokenAsync()).data);
  } catch {
    return null;
  }
}

async function registrieren(): Promise<void> {
  const token = await geraeteToken();
  if (!token) return;
  await request('POST', '/push-tokens', { body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } }).catch(() => {});
}

// Nach einer Bestellung: im passenden Moment fragen (das System fragt nur
// einmal — ohne Erklärung davor lehnen viele ab). Schon erlaubt → still
// registrieren. Erfolgreich oder nicht, die Bestellung ist davon unabhängig.
/** mitKrankenkasse: die Bestellung enthält einen eingereichten Kassenartikel —
 * dann ist die Kassenentscheidung die Neuigkeit, sonst Lieferung und Termin. */
export async function pushNachBestellungAnbieten(mitKrankenkasse: boolean): Promise<void> {
  if (!push) return;
  const { status, canAskAgain } = await push.getPermissionsAsync();
  if (status === 'granted') return registrieren();
  if (!canAskAgain) return;
  const zustimmen = await new Promise<boolean>((resolve) =>
    Alert.alert(
      'Benachrichtigen, wenn es Neuigkeiten gibt?',
      mitKrankenkasse
        ? 'Wir sagen dir Bescheid, sobald deine Krankenkasse entschieden hat und du deinen Liefertermin wählen kannst.'
        : 'Wir sagen dir Bescheid, wenn sich bei deiner Lieferung oder deinem Termin etwas ändert.',
      [
        { text: 'Später', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Ja, benachrichtigen', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
  if (!zustimmen) return;
  const ergebnis = await push.requestPermissionsAsync();
  if (ergebnis.status === 'granted') await registrieren();
}

// Einstellungen → Push-Benachrichtigungen: Stand zeigen und den nächsten
// sinnvollen Schritt anbieten (erlauben bzw. in den iOS-Einstellungen ändern —
// einmal abgelehnt, kann nur noch das System die Erlaubnis erteilen).
export async function pushEinstellungen(istKunde: boolean): Promise<void> {
  if (!push) {
    Alert.alert('Benachrichtigungen', 'Diese App-Version kann noch keine Benachrichtigungen empfangen.');
    return;
  }
  const { status, canAskAgain } = await push.getPermissionsAsync();
  if (status === 'granted') {
    Alert.alert('Benachrichtigungen sind an', 'Wir melden uns, wenn es Neuigkeiten zu deiner Versorgung gibt. Ausschalten kannst du sie in den iOS-Einstellungen.', [
      { text: 'OK', style: 'cancel' },
      { text: 'iOS-Einstellungen', onPress: () => Linking.openSettings() },
    ]);
    if (istKunde) await registrieren();
    return;
  }
  if (!canAskAgain) {
    Alert.alert('Benachrichtigungen sind aus', 'Du kannst sie in den iOS-Einstellungen für SaniMe einschalten.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'iOS-Einstellungen', onPress: () => Linking.openSettings() },
    ]);
    return;
  }
  const ergebnis = await push.requestPermissionsAsync();
  if (ergebnis.status === 'granted' && istKunde) await registrieren();
}

// Beim App-Start eines bekannten Kunden: Tokens können sich ändern.
export async function pushTokenAuffrischen(): Promise<void> {
  if (!push) return;
  const { status } = await push.getPermissionsAsync();
  if (status === 'granted') await registrieren();
}

// Vor dem Abmelden: dieses Gerät bekommt keine Nachrichten mehr zur Person.
export async function pushAbmelden(): Promise<void> {
  const token = await geraeteToken();
  if (!token) return;
  await request('DELETE', '/push-tokens', { body: { token } }).catch(() => {});
}

// Tippt der Kunde auf eine Nachricht, öffnet sich die Versorgung (auch aus
// einer beendeten App). Kommt eine Nachricht im Vordergrund, ist der Stand neu.
export function usePushNavigation(bereit: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (!push || !bereit) return;
    push.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    const oeffnen = (data: Record<string, unknown> | undefined) => {
      const supplyId = typeof data?.supplyId === 'string' ? data.supplyId : null;
      useVersorgungStore.getState().laden();
      if (supplyId) router.push(`/dashboard/${supplyId}`);
    };
    push.getLastNotificationResponseAsync().then((r) => r && oeffnen(r.notification.request.content.data));
    const antwort = push.addNotificationResponseReceivedListener((r) => oeffnen(r.notification.request.content.data));
    const empfangen = push.addNotificationReceivedListener(() => useVersorgungStore.getState().laden());
    return () => {
      antwort.remove();
      empfangen.remove();
    };
  }, [bereit, router]);
}
