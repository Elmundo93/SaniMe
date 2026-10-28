import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { api } from '../api/admin';
import { ApiFehler } from '../api/client';
import { useAnsage } from '../komponenten/Ansage';
import { Etikett, StatusEtikett } from '../komponenten/Etikett';
import { Laedt, Meldung } from '../komponenten/Meldung';
import { Seite } from '../komponenten/Seite';
import { datum, STATUS_GRUPPEN, type StatusGruppe } from '../fachtexte';

const PRO_SEITE = 25;

function istGruppe(wert: string | null): wert is StatusGruppe {
  return wert !== null && wert in STATUS_GRUPPEN;
}

// Suche und Filter stehen in der URL: teilbar mit Kolleg:innen, und die
// Zurück-Taste des Browsers stellt den vorigen Stand wieder her.
export function Versorgungen() {
  const [suchparameter, setSuchparameter] = useSearchParams();
  const location = useLocation();
  const ansagen = useAnsage();
  const q = suchparameter.get('q') ?? '';
  const gruppeRoh = suchparameter.get('gruppe');
  const gruppe = istGruppe(gruppeRoh) ? gruppeRoh : '';
  const seite = Math.max(1, Number(suchparameter.get('seite')) || 1);
  const sucheFokussieren = Boolean((location.state as { sucheFokussieren?: boolean } | null)?.sucheFokussieren);

  const liste = useQuery({
    queryKey: ['versorgungen', q, gruppe, seite],
    queryFn: () =>
      api.versorgungen({
        q: q || undefined,
        status: gruppe ? [...STATUS_GRUPPEN[gruppe].status] : undefined,
        limit: PRO_SEITE,
        offset: (seite - 1) * PRO_SEITE,
      }),
    placeholderData: keepPreviousData,
  });

  const gesamt = liste.data?.gesamt ?? 0;
  const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE));

  useEffect(() => {
    if (liste.data && !liste.isPlaceholderData) {
      ansagen(gesamt === 1 ? '1 Versorgung gefunden' : `${gesamt} Versorgungen gefunden`);
    }
  }, [liste.data, liste.isPlaceholderData, gesamt, ansagen]);

  const seiteLink = (nummer: number) => {
    const neu = new URLSearchParams(suchparameter);
    if (nummer <= 1) neu.delete('seite');
    else neu.set('seite', String(nummer));
    return `?${neu.toString()}`;
  };

  return (
    <Seite titel="Versorgungen" unterzeile="Alle Bestellungen — suchen nach Name, Versichertennummer, Produkt, Krankenkasse oder Bestellnummer.">
      {/* key: Zurück-Taste/Link ändert die URL → Formular übernimmt den neuen Stand. */}
      <Suchformular
        key={`${q}|${gruppe}`}
        q={q}
        gruppe={gruppe}
        fokussieren={sucheFokussieren}
        onSuchen={(neu) => setSuchparameter(neu)}
      />

      {liste.isLoading ? <Laedt was="Die Liste" /> : null}
      {liste.error ? (
        <Meldung art="fehler">{liste.error instanceof ApiFehler ? liste.error.message : 'Die Liste konnte nicht geladen werden.'}</Meldung>
      ) : null}
      {liste.data && liste.data.eintraege.length === 0 ? (
        <Meldung art="info" titel="Keine Treffer.">
          {q || gruppe ? 'Prüfe die Schreibweise oder setze den Filter zurück.' : 'Es sind noch keine Bestellungen eingegangen.'}
        </Meldung>
      ) : null}

      {liste.data && liste.data.eintraege.length > 0 ? (
        <>
          <div className="tabellenhuelle" aria-busy={liste.isFetching}>
            <table className="stapel">
              <caption className="nur-screenreader">
                Versorgungen, Seite {seite} von {seiten}, {gesamt} insgesamt, neueste zuerst
              </caption>
              <thead>
                <tr>
                  <th scope="col">Kunde</th>
                  <th scope="col">Produkt</th>
                  <th scope="col">Krankenkasse</th>
                  <th scope="col">Status</th>
                  <th scope="col">Eingang</th>
                </tr>
              </thead>
              <tbody>
                {liste.data.eintraege.map((zeile) => (
                  <tr key={zeile.orderId}>
                    <th scope="row">
                      <Link to={`/versorgungen/${zeile.orderId}`}>{zeile.kundeName ?? 'Ohne Kundenkonto'}</Link>
                      <div className="klein">Nr. {zeile.orderId.slice(0, 8)}</div>
                    </th>
                    <td data-titel="Produkt">
                      {zeile.produktName}{' '}
                      {zeile.selbstzahler ? (
                        <Etikett ton="neutral">Selbstzahler</Etikett>
                      ) : null}
                    </td>
                    <td data-titel="Krankenkasse">{zeile.kasse || <span className="klein">–</span>}</td>
                    <td data-titel="Status">
                      <StatusEtikett status={zeile.status} />
                    </td>
                    <td data-titel="Eingang">{datum(zeile.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {seiten > 1 ? (
            <nav className="seitenwahl" aria-label="Seiten">
              {seite > 1 ? (
                <Link className="knopf" to={seiteLink(seite - 1)}>
                  Vorherige Seite
                </Link>
              ) : (
                <span />
              )}
              <span>
                Seite {seite} von {seiten}
              </span>
              {seite < seiten ? (
                <Link className="knopf" to={seiteLink(seite + 1)}>
                  Nächste Seite
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      ) : null}
    </Seite>
  );
}

function Suchformular({
  q,
  gruppe,
  fokussieren,
  onSuchen,
}: {
  q: string;
  gruppe: StatusGruppe | '';
  fokussieren: boolean;
  onSuchen: (parameter: URLSearchParams) => void;
}) {
  const [eingabe, setEingabe] = useState(q);
  const [gruppeEingabe, setGruppeEingabe] = useState<StatusGruppe | ''>(gruppe);
  const suchfeld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fokussieren) suchfeld.current?.focus();
  }, [fokussieren]);

  const suchen = (event: FormEvent) => {
    event.preventDefault();
    const neu = new URLSearchParams();
    if (eingabe.trim()) neu.set('q', eingabe.trim());
    if (gruppeEingabe) neu.set('gruppe', gruppeEingabe);
    onSuchen(neu);
  };

  return (
    <form className="suchleiste" role="search" onSubmit={suchen} aria-label="Versorgungen durchsuchen">
      <div className="feld">
        <label htmlFor="suche">Suchbegriff</label>
        <input ref={suchfeld} id="suche" type="search" value={eingabe} onChange={(e) => setEingabe(e.target.value)} />
      </div>
      <div className="feld">
        <label htmlFor="gruppe">Status</label>
        <select id="gruppe" value={gruppeEingabe} onChange={(e) => setGruppeEingabe(e.target.value as StatusGruppe | '')}>
          <option value="">Alle</option>
          {(Object.keys(STATUS_GRUPPEN) as StatusGruppe[]).map((schluessel) => (
            <option key={schluessel} value={schluessel}>
              {STATUS_GRUPPEN[schluessel].label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="knopf knopf-primaer">
        Suchen
      </button>
      {q || gruppe ? (
        <Link to="/versorgungen" className="knopf knopf-schlicht">
          Filter zurücksetzen
        </Link>
      ) : null}
    </form>
  );
}
