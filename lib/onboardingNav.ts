import { Alert } from 'react-native';
import { REZEPT_VERSORGUNG_NICHT_VERFUEGBAR } from '@sanime/domain';

// dispatch() liefert {ok:false} nur bei einer fehlenden Transition-Regel oder einer
// nicht erfüllten Guard-Bedingung — im Normalfall ein Zeichen für eine veraltete/
// verwaiste Session (Race Condition, Storage-Divergenz). Zentral statt pro Screen
// wiederholt, damit kein "Weiter"/"Zurück" beim Fehlschlag stillschweigend nichts tut.
// Ausnahme: Meldungen, die der Server bewusst für den Kunden formuliert (mit
// konkretem nächsten Schritt), werden so gezeigt.
export function zeigeDispatchFehler(reason?: string) {
  if (reason === REZEPT_VERSORGUNG_NICHT_VERFUEGBAR) {
    Alert.alert('Noch nicht verfügbar', reason);
    return;
  }
  Alert.alert(
    'Das hat nicht funktioniert',
    'Bitte versuche es erneut. Falls das Problem bestehen bleibt, starte die App neu.',
  );
}
