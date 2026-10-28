import { Link } from 'react-router';
import { Seite } from '../komponenten/Seite';

export function NichtGefunden() {
  return (
    <Seite titel="Seite nicht gefunden">
      <p>Diese Adresse gibt es nicht. Vielleicht hilft der Arbeitskorb weiter.</p>
      <Link to="/">Zum Arbeitskorb</Link>
    </Seite>
  );
}
