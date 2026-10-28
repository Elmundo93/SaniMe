import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { api, type DetailAufgabe, type VersorgungsDetail } from '../../api/admin';
import { ApiFehler } from '../../api/client';
import { useAnsage } from '../../komponenten/Ansage';
import { Etikett } from '../../komponenten/Etikett';
import { seit } from '../../fachtexte';

// Schritt-Aufgaben erledigt der Statuswechsel, Rückrufe das Rückruf-Ergebnis —
// nur alles andere bekommt einen „Erledigt“-Knopf (wie im Backend geprüft).
function manuellErledigbar(aufgabe: DetailAufgabe) {
  return aufgabe.audience === 'intern' && aufgabe.actionType !== 'schritt' && aufgabe.actionType !== 'rueckruf';
}

export function Aufgaben({ detail, ich, darfSchreiben }: { detail: VersorgungsDetail; ich: string; darfSchreiben: boolean }) {
  const queryClient = useQueryClient();
  const ansagen = useAnsage();
  const titelId = useId();

  const aendern = useMutation({
    mutationFn: ({ aufgabe, aktion }: { aufgabe: DetailAufgabe; aktion: 'uebernehmen' | 'freigeben' | 'erledigen' }) =>
      api[aktion](aufgabe.id),
    onSuccess: (_, { aufgabe, aktion }) => {
      const text = { uebernehmen: 'übernommen', freigeben: 'freigegeben', erledigen: 'als erledigt markiert' }[aktion];
      ansagen(`„${aufgabe.title}“ ${text}.`);
    },
    onError: (e) => ansagen(e instanceof ApiFehler ? e.message : 'Das hat nicht geklappt. Bitte versuche es erneut.', true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['versorgung', detail.order.id] });
      queryClient.invalidateQueries({ queryKey: ['arbeitskorb'] });
    },
  });

  return (
    <section className="karte" aria-labelledby={titelId}>
      <h2 id={titelId}>Offene Aufgaben</h2>
      {detail.aufgaben.length === 0 ? <p>Keine offenen Aufgaben.</p> : null}
      <ul className="liste-schlicht">
        {detail.aufgaben.map((aufgabe) => {
          const beschaeftigt = aendern.isPending && aendern.variables?.aufgabe.id === aufgabe.id;
          return (
            <li key={aufgabe.id}>
              <div className="eintrag-kopf" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <strong>{aufgabe.title}</strong>
                {aufgabe.audience === 'kunde' ? <Etikett ton="info">Wartet auf den Kunden</Etikett> : <Etikett ton="neutral">Team</Etikett>}
              </div>
              <p className="klein">
                {aufgabe.description} · {seit(aufgabe.createdAt)}
                {aufgabe.assignedAdminId ? ` · Bearbeitung: ${aufgabe.assignedAdminId === ich ? 'du' : aufgabe.assignedAdminName}` : ''}
              </p>
              {darfSchreiben && aufgabe.audience === 'intern' ? (
                <div className="knopfreihe">
                  {aufgabe.assignedAdminId === ich ? (
                    <button type="button" className="knopf knopf-schlicht" disabled={beschaeftigt} onClick={() => aendern.mutate({ aufgabe, aktion: 'freigeben' })}>
                      Freigeben<span className="nur-screenreader">: {aufgabe.title}</span>
                    </button>
                  ) : (
                    <button type="button" className="knopf" disabled={beschaeftigt} onClick={() => aendern.mutate({ aufgabe, aktion: 'uebernehmen' })}>
                      Übernehmen<span className="nur-screenreader">: {aufgabe.title}</span>
                    </button>
                  )}
                  {manuellErledigbar(aufgabe) ? (
                    <button type="button" className="knopf" disabled={beschaeftigt} onClick={() => aendern.mutate({ aufgabe, aktion: 'erledigen' })}>
                      Erledigt<span className="nur-screenreader">: {aufgabe.title}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
