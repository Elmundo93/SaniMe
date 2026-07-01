import { Alert } from 'react-native';

// dispatch() liefert {ok:false} nur bei einer fehlenden Transition-Regel oder einer
// nicht erfüllten Guard-Bedingung — im Normalfall ein Zeichen für eine veraltete/
// verwaiste Session (Race Condition, Storage-Divergenz). Zentral statt pro Screen
// wiederholt, damit kein "Weiter"/"Zurück" beim Fehlschlag stillschweigend nichts tut.
export function zeigeDispatchFehler() {
  Alert.alert(
    'Das hat nicht funktioniert',
    'Bitte versuche es erneut. Falls das Problem bestehen bleibt, starte die App neu.',
  );
}
