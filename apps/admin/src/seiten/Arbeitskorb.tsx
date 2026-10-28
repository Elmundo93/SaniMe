import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { api, type Aufgabe } from '../api/admin';
import { ApiFehler } from '../api/client';
import { useAnsage } from '../komponenten/Ansage';
import { DringlichkeitEtikett } from '../komponenten/Etikett';
import { ARBEITSKORB_INTERVALL_MS } from '../komponenten/Layout';
import { Laedt, Meldung } from '../komponenten/Meldung';
import { Seite } from '../komponenten/Seite';
import { fristText, personName, seit } from '../fachtexte';
import { useSitzung } from '../sitzung/Sitzung';

const ANSICHTEN = {
  alle: { label: 'Alle', passt: () => true },
  mir: { label: 'Mir zugewiesen', passt: (a: Aufgabe, ich: string) => a.assignedAdminId === ich },
  frei: { label: 'Nicht zugewiesen', passt: (a: Aufgabe) => a.assignedAdminId === null },
  notfall: { label: 'Notfälle', passt: (a: Aufgabe) => a.dringlichkeit === 'notfall' },
} as const;
type Ansicht = keyof typeof ANSICHTEN;

function istAnsicht(wert: string | null): wert is Ansicht {
  return wert !== null && wert in ANSICHTEN;
}

export function Arbeitskorb() {
  const sitzung = useSitzung();
  const ich = sitzung.profil!.id;
  const [suchparameter] = useSearchParams();
  const roh = suchparameter.get('ansicht');
  const ansicht: Ansicht = istAnsicht(roh) ? roh : 'alle';
  const queryClient = useQueryClient();
  const ansagen = useAnsage();
  const darfSchreiben = sitzung.darf('orders:write');

  const aufgaben = useQuery({ queryKey: ['arbeitskorb'], queryFn: api.arbeitskorb, refetchInterval: ARBEITSKORB_INTERVALL_MS });

  const zuweisen = useMutation({
    mutationFn: ({ aufgabe, uebernehmen }: { aufgabe: Aufgabe; uebernehmen: boolean }) =>
      uebernehmen ? api.uebernehmen(aufgabe.id) : api.freigeben(aufgabe.id),
    onSuccess: (_, { aufgabe, uebernehmen }) => {
      ansagen(uebernehmen ? `Du hast „${aufgabe.title}“ übernommen.` : `„${aufgabe.title}“ ist wieder frei.`);
    },
    onError: (fehler) => ansagen(fehler instanceof ApiFehler ? fehler.message : 'Das hat nicht geklappt. Bitte versuche es erneut.', true),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['arbeitskorb'] }),
  });

  const alle = aufgaben.data ?? [];
  const sichtbar = alle.filter((a) => ANSICHTEN[ansicht].passt(a, ich));

  return (
    <Seite
      titel="Arbeitskorb"
      unterzeile="Was jetzt zu tun ist — Notfälle und ablaufende Fristen zuerst, sonst die älteste Aufgabe oben."
    >
      <nav aria-label="Aufgaben filtern">
        <ul className="reiter">
          {(Object.keys(ANSICHTEN) as Ansicht[]).map((schluessel) => {
            const anzahl = alle.filter((a) => ANSICHTEN[schluessel].passt(a, ich)).length;
            return (
              <li key={schluessel}>
                <Link to={schluessel === 'alle' ? '/' : `/?ansicht=${schluessel}`} aria-current={ansicht === schluessel ? 'page' : undefined}>
                  {ANSICHTEN[schluessel].label}
                  <span className="zaehler">
                    {anzahl}
                    <span className="nur-screenreader"> Aufgaben</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {aufgaben.isLoading ? <Laedt was="Der Arbeitskorb" /> : null}
      {aufgaben.error ? (
        <Meldung art="fehler">
          {aufgaben.error instanceof ApiFehler ? aufgaben.error.message : 'Der Arbeitskorb konnte nicht geladen werden.'} Er wird automatisch
          erneut geladen.
        </Meldung>
      ) : null}

      {aufgaben.data && sichtbar.length === 0 ? (
        <Meldung art="erfolg" titel="Alles erledigt.">
          {ansicht === 'alle'
            ? 'Neue Bestellungen und Rückrufbitten erscheinen hier automatisch.'
            : 'In dieser Ansicht gibt es gerade nichts zu tun.'}
        </Meldung>
      ) : null}

      {sichtbar.length > 0 ? (
        <div className="tabellenhuelle">
          <table className="stapel">
            <caption className="nur-screenreader">
              {ANSICHTEN[ansicht].label}: {sichtbar.length} offene Aufgaben, nach Dringlichkeit sortiert
            </caption>
            <thead>
              <tr>
                <th scope="col">Dringlichkeit</th>
                <th scope="col">Aufgabe</th>
                <th scope="col">Kunde und Versorgung</th>
                <th scope="col">Wartet</th>
                <th scope="col">Frist der Kasse</th>
                <th scope="col">Bearbeitung</th>
              </tr>
            </thead>
            <tbody>
              {sichtbar.map((aufgabe) => (
                <tr key={aufgabe.id}>
                  <td data-titel="Dringlichkeit">
                    <DringlichkeitEtikett dringlichkeit={aufgabe.dringlichkeit} />
                  </td>
                  <th scope="row">
                    <Link to={`/versorgungen/${aufgabe.orderId}`}>{aufgabe.title}</Link>
                    <div className="klein">{aufgabe.description}</div>
                  </th>
                  <td data-titel="Kunde">
                    {aufgabe.kundeName ?? <span className="klein">Noch kein Kundenkonto</span>}
                    <div className="klein">
                      {aufgabe.produktName}
                      {aufgabe.kasse ? ` · ${aufgabe.kasse}` : ''}
                    </div>
                  </td>
                  <td data-titel="Wartet">{seit(aufgabe.createdAt)}</td>
                  <td data-titel="Frist">{aufgabe.fristBis ? fristText(aufgabe.fristBis) : <span className="klein">keine</span>}</td>
                  <td data-titel="Bearbeitung">
                    <Bearbeitung
                      aufgabe={aufgabe}
                      ich={ich}
                      darfSchreiben={darfSchreiben}
                      beschaeftigt={zuweisen.isPending && zuweisen.variables?.aufgabe.id === aufgabe.id}
                      onZuweisen={(uebernehmen) => zuweisen.mutate({ aufgabe, uebernehmen })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Seite>
  );
}

function Bearbeitung({
  aufgabe,
  ich,
  darfSchreiben,
  beschaeftigt,
  onZuweisen,
}: {
  aufgabe: Aufgabe;
  ich: string;
  darfSchreiben: boolean;
  beschaeftigt: boolean;
  onZuweisen: (uebernehmen: boolean) => void;
}) {
  const bearbeiter = personName({ name: aufgabe.assignedAdminName, email: aufgabe.assignedAdminEmail });
  if (aufgabe.assignedAdminId === ich) {
    return (
      <>
        <div>Du</div>
        {darfSchreiben ? (
          <button type="button" className="knopf knopf-schlicht" disabled={beschaeftigt} onClick={() => onZuweisen(false)}>
            Freigeben<span className="nur-screenreader">: {aufgabe.title}</span>
          </button>
        ) : null}
      </>
    );
  }
  if (aufgabe.assignedAdminId) return <>{bearbeiter}</>;
  if (!darfSchreiben) return <span className="klein">Niemand</span>;
  return (
    <button type="button" className="knopf" disabled={beschaeftigt} onClick={() => onZuweisen(true)}>
      Übernehmen<span className="nur-screenreader">: {aufgabe.title}</span>
    </button>
  );
}
