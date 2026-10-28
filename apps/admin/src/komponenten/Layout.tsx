import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { api } from '../api/admin';
import { personName } from '../fachtexte';
import { useSitzung } from '../sitzung/Sitzung';
import { Dialog } from './Dialog';
import { Laedt } from './Meldung';

// Arbeitskorb alle 30 s neu laden — neue Bestellungen erscheinen ohne Neuladen.
export const ARBEITSKORB_INTERVALL_MS = 30_000;

const KUERZEL_SCHLUESSEL = 'sanime_admin_kuerzel';

function kuerzelGespeichert(): boolean {
  try {
    return window.localStorage.getItem(KUERZEL_SCHLUESSEL) !== 'aus';
  } catch {
    return true;
  }
}

function kuerzelSpeichern(an: boolean) {
  try {
    window.localStorage.setItem(KUERZEL_SCHLUESSEL, an ? 'an' : 'aus');
  } catch {
    // Privater Modus o. Ä. — dann gilt die Einstellung nur bis zum Neuladen.
  }
}

function tipptGerade(ziel: EventTarget | null) {
  if (!(ziel instanceof HTMLElement)) return false;
  return ziel.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(ziel.tagName);
}

export function Layout() {
  const sitzung = useSitzung();
  const location = useLocation();
  const navigate = useNavigate();
  const [hilfeOffen, setHilfeOffen] = useState(false);
  const [kuerzelAn, setKuerzelAn] = useState(kuerzelGespeichert);
  const wartetAufZweiteTaste = useRef(false);

  const arbeitskorb = useQuery({
    queryKey: ['arbeitskorb'],
    queryFn: api.arbeitskorb,
    enabled: Boolean(sitzung.profil),
    refetchInterval: ARBEITSKORB_INTERVALL_MS,
  });
  const offen = arbeitskorb.data?.length ?? 0;

  // Tastenkürzel nur ohne Modifikatortasten und nie beim Tippen; komplett
  // abschaltbar (WCAG 2.1.4), Einstellung bleibt im Browser.
  useEffect(() => {
    if (!kuerzelAn) return;
    const beiTaste = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || tipptGerade(event.target)) return;
      if (wartetAufZweiteTaste.current) {
        wartetAufZweiteTaste.current = false;
        if (event.key === 'a') navigate('/');
        if (event.key === 'v') navigate('/versorgungen');
        return;
      }
      if (event.key === 'g') {
        wartetAufZweiteTaste.current = true;
        window.setTimeout(() => (wartetAufZweiteTaste.current = false), 1500);
      } else if (event.key === '/') {
        event.preventDefault();
        navigate('/versorgungen', { state: { sucheFokussieren: true } });
      } else if (event.key === '?') {
        setHilfeOffen(true);
      }
    };
    window.addEventListener('keydown', beiTaste);
    return () => window.removeEventListener('keydown', beiTaste);
  }, [kuerzelAn, navigate]);

  if (sitzung.laedt) {
    return (
      <main id="inhalt">
        <Laedt was="Deine Sitzung" />
      </main>
    );
  }
  if (!sitzung.profil) {
    const weiter = `${location.pathname}${location.search}`;
    return <Navigate to={weiter === '/' ? '/anmelden' : `/anmelden?weiter=${encodeURIComponent(weiter)}`} replace />;
  }

  return (
    <>
      <a className="sprunglink" href="#inhalt">
        Zum Inhalt springen
      </a>
      <div className="rahmen">
        <header className="seitenleiste">
          <NavLink to="/" className="marke" aria-label="SaniMe Admin, zum Arbeitskorb">
            Sani<span>Me</span>&nbsp;Admin
          </NavLink>
          <nav className="hauptnavigation" aria-label="Hauptnavigation">
            <ul>
              <li>
                <NavLink to="/" end>
                  Arbeitskorb
                  {arbeitskorb.data ? (
                    <span className="zaehler">
                      {offen}
                      <span className="nur-screenreader"> offene Aufgaben</span>
                    </span>
                  ) : null}
                </NavLink>
              </li>
              <li>
                <NavLink to="/versorgungen">Versorgungen</NavLink>
              </li>
            </ul>
          </nav>
          <div className="konto">
            <p>
              Angemeldet als <strong>{personName(sitzung.profil)}</strong>
            </p>
            <div className="knopfreihe">
              <button type="button" className="knopf knopf-schlicht" onClick={() => setHilfeOffen(true)}>
                Tastenkürzel
              </button>
              <button type="button" className="knopf" onClick={() => sitzung.abmelden().then(() => navigate('/anmelden'))}>
                Abmelden
              </button>
            </div>
          </div>
        </header>
        <main id="inhalt" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <Dialog offen={hilfeOffen} titel="Tastenkürzel" onSchliessen={() => setHilfeOffen(false)}>
        <dl className="datenliste">
          <dt>
            <kbd>g</kbd> dann <kbd>a</kbd>
          </dt>
          <dd>Arbeitskorb öffnen</dd>
          <dt>
            <kbd>g</kbd> dann <kbd>v</kbd>
          </dt>
          <dd>Versorgungen öffnen</dd>
          <dt>
            <kbd>/</kbd>
          </dt>
          <dd>Versorgung suchen</dd>
          <dt>
            <kbd>?</kbd>
          </dt>
          <dd>Diese Übersicht</dd>
          <dt>
            <kbd>Esc</kbd>
          </dt>
          <dd>Dialog schließen</dd>
        </dl>
        <label className="auswahl" style={{ marginTop: '1rem' }}>
          <input
            type="checkbox"
            checked={kuerzelAn}
            onChange={(e) => {
              setKuerzelAn(e.target.checked);
              kuerzelSpeichern(e.target.checked);
            }}
          />
          <span>Tastenkürzel verwenden (ausschalten, falls sie mit deinem Screenreader oder einer Spracheingabe kollidieren)</span>
        </label>
        <div className="knopfreihe">
          <button type="button" className="knopf knopf-primaer" onClick={() => setHilfeOffen(false)}>
            Schließen
          </button>
        </div>
      </Dialog>
    </>
  );
}
