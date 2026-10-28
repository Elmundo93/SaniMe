import QRCode from 'qrcode';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { api, type LoginErgebnis } from '../api/admin';
import { ApiFehler } from '../api/client';
import { Meldung } from '../komponenten/Meldung';
import { useSitzung } from '../sitzung/Sitzung';

// Nur Pfade innerhalb der App als Rücksprung — nie eine fremde URL.
function sichererRuecksprung(wert: string | null) {
  return wert && wert.startsWith('/') && !wert.startsWith('//') ? wert : '/';
}

export function Anmelden() {
  const sitzung = useSitzung();
  const navigate = useNavigate();
  const [suchparameter] = useSearchParams();
  const weiter = sichererRuecksprung(suchparameter.get('weiter'));
  const [schritt, setSchritt] = useState<LoginErgebnis | null>(null);

  useEffect(() => {
    document.title = 'Anmelden – SaniMe Admin';
  }, []);

  if (sitzung.profil) return <Navigate to={weiter} replace />;

  return (
    <main className="anmeldung" id="inhalt">
      <div className="karte">
        <p className="marke" aria-hidden="true">
          Sani<span>Me</span>&nbsp;Admin
        </p>
        {schritt === null ? (
          <Zugangsdaten hinweis={sitzung.hinweis} onWeiter={setSchritt} />
        ) : (
          <ZweiterFaktor
            schritt={schritt}
            onZurueck={() => setSchritt(null)}
            onFertig={(profil) => {
              sitzung.angemeldet(profil);
              navigate(weiter, { replace: true });
            }}
          />
        )}
      </div>
    </main>
  );
}

function Zugangsdaten({ hinweis, onWeiter }: { hinweis: string | null; onWeiter: (ergebnis: LoginErgebnis) => void }) {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const ueberschrift = useRef<HTMLHeadingElement>(null);
  const emailFeld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ueberschrift.current?.focus();
  }, []);

  const absenden = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !passwort) {
      setFehler('Bitte gib deine E-Mail-Adresse und dein Passwort ein.');
      emailFeld.current?.focus();
      return;
    }
    setSendet(true);
    setFehler(null);
    try {
      onWeiter(await api.login(email.trim(), passwort));
    } catch (e) {
      setFehler(e instanceof ApiFehler ? e.message : 'Die Anmeldung hat nicht geklappt. Bitte versuche es erneut.');
      setPasswort('');
      emailFeld.current?.focus();
    } finally {
      setSendet(false);
    }
  };

  return (
    <form onSubmit={absenden} noValidate aria-describedby={fehler ? 'anmelde-fehler' : undefined}>
      <h1 ref={ueberschrift} tabIndex={-1}>
        Anmelden
      </h1>
      {hinweis ? <Meldung art="info">{hinweis}</Meldung> : null}
      {fehler ? (
        <div id="anmelde-fehler">
          <Meldung art="fehler">{fehler}</Meldung>
        </div>
      ) : null}
      <div className="feld">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input
          ref={emailFeld}
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={fehler ? true : undefined}
          required
        />
      </div>
      <div className="feld">
        <label htmlFor="passwort">Passwort</label>
        <input
          id="passwort"
          type="password"
          autoComplete="current-password"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          aria-invalid={fehler ? true : undefined}
          required
        />
      </div>
      <button type="submit" className="knopf knopf-primaer" disabled={sendet}>
        {sendet ? 'Wird geprüft …' : 'Weiter'}
      </button>
    </form>
  );
}

function ZweiterFaktor({
  schritt,
  onZurueck,
  onFertig,
}: {
  schritt: LoginErgebnis;
  onZurueck: () => void;
  onFertig: (profil: Awaited<ReturnType<typeof api.code>>) => void;
}) {
  const [code, setCode] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const ueberschrift = useRef<HTMLHeadingElement>(null);
  const codeFeld = useRef<HTMLInputElement>(null);
  const einrichten = schritt.schritt === 'einrichten';

  useEffect(() => {
    ueberschrift.current?.focus();
    if (schritt.schritt === 'einrichten') {
      QRCode.toDataURL(schritt.otpauthUrl, { margin: 1, width: 200 })
        .then(setQr)
        .catch(() => setQr(null));
    }
  }, [schritt]);

  const absenden = async (event: FormEvent) => {
    event.preventDefault();
    const bereinigt = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(bereinigt)) {
      setFehler('Bitte gib den 6-stelligen Code aus deiner Authenticator-App ein.');
      codeFeld.current?.focus();
      return;
    }
    setSendet(true);
    setFehler(null);
    try {
      onFertig(await api.code(schritt.challengeToken, bereinigt));
    } catch (e) {
      setFehler(e instanceof ApiFehler ? e.message : 'Der Code konnte nicht geprüft werden. Bitte versuche es erneut.');
      setCode('');
      codeFeld.current?.focus();
    } finally {
      setSendet(false);
    }
  };

  return (
    <form onSubmit={absenden} noValidate>
      <h1 ref={ueberschrift} tabIndex={-1}>
        {einrichten ? 'Zweiten Faktor einrichten' : 'Code eingeben'}
      </h1>
      {schritt.schritt === 'einrichten' ? (
        <>
          <p>
            Zum Schutz der Gesundheitsdaten brauchst du neben dem Passwort einen Code vom Handy. Das richtest du einmalig ein:
          </p>
          <ol>
            <li>Öffne eine Authenticator-App (z. B. Microsoft Authenticator, Google Authenticator oder 1Password).</li>
            <li>Scanne den QR-Code oder tippe den Schlüssel ab.</li>
            <li>Gib den 6-stelligen Code ein, den die App dann anzeigt.</li>
          </ol>
          {qr ? (
            <p className="qr">
              <img src={qr} width={200} height={200} alt="QR-Code für die Authenticator-App. Alternativ den Schlüssel darunter abtippen." />
            </p>
          ) : null}
          <p>
            Schlüssel zum Abtippen:
            <br />
            <span className="geheimnis">{schritt.geheimnis.match(/.{1,4}/g)?.join(' ')}</span>
          </p>
        </>
      ) : (
        <p>Gib den aktuellen 6-stelligen Code aus deiner Authenticator-App ein.</p>
      )}
      {fehler ? <Meldung art="fehler">{fehler}</Meldung> : null}
      <div className="feld">
        <label htmlFor="code">6-stelliger Code</label>
        <input
          ref={codeFeld}
          id="code"
          type="text"
          className="code-eingabe"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={fehler ? true : undefined}
          aria-describedby="code-hinweis"
        />
        <span id="code-hinweis" className="hinweis">
          Der Code wechselt alle 30 Sekunden.
        </span>
      </div>
      <div className="knopfreihe">
        <button type="submit" className="knopf knopf-primaer" disabled={sendet}>
          {sendet ? 'Wird geprüft …' : einrichten ? 'Einrichten und anmelden' : 'Anmelden'}
        </button>
        <button type="button" className="knopf knopf-schlicht" onClick={onZurueck}>
          Zurück zu E-Mail und Passwort
        </button>
      </div>
    </form>
  );
}
