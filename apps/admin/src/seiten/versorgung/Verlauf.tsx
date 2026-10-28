import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { api, type VersorgungsDetail } from '../../api/admin';
import { ApiFehler } from '../../api/client';
import { useAnsage } from '../../komponenten/Ansage';
import { Etikett } from '../../komponenten/Etikett';
import { Meldung } from '../../komponenten/Meldung';
import { datumZeit } from '../../fachtexte';

type Eintrag =
  | { art: 'kunde'; id: string; zeit: string; titel: string; text: string; vonTeam: boolean }
  | { art: 'intern'; id: string; zeit: string; autor: string; text: string };

// Ein chronologischer Verlauf, klar getrennt nach „sieht der Kunde“ und „intern“.
function eintraege(detail: VersorgungsDetail): Eintrag[] {
  const kunde: Eintrag[] = detail.supply.timeline.map((t) => ({
    art: 'kunde',
    id: t.id,
    zeit: t.occurredAt ?? t.createdAt,
    titel: t.label,
    text: t.description,
    vonTeam: t.source === 'admin',
  }));
  const intern: Eintrag[] = detail.notes.map((n) => ({ art: 'intern', id: n.id, zeit: n.createdAt, autor: n.autor, text: n.body }));
  return [...kunde, ...intern].sort((a, b) => new Date(b.zeit).getTime() - new Date(a.zeit).getTime());
}

export function Verlauf({ detail, darfSchreiben }: { detail: VersorgungsDetail; darfSchreiben: boolean }) {
  const titelId = useId();
  const liste = eintraege(detail);
  return (
    <section className="karte" aria-labelledby={titelId}>
      <h2 id={titelId}>Verlauf und Notizen</h2>
      {darfSchreiben ? <Eingabe orderId={detail.order.id} /> : null}
      <h3 className="nur-screenreader">Bisheriger Verlauf, neueste zuerst</h3>
      <ol className="liste-schlicht verlauf">
        {liste.map((eintrag) => (
          <li key={`${eintrag.art}-${eintrag.id}`}>
            <div className="eintrag-kopf">
              {eintrag.art === 'intern' ? (
                <Etikett ton="warnung" symbol="🔒">
                  Intern
                </Etikett>
              ) : (
                <Etikett ton="info" symbol="👁">
                  Sieht der Kunde
                </Etikett>
              )}
              <time dateTime={eintrag.zeit}>{datumZeit(eintrag.zeit)}</time>
            </div>
            {eintrag.art === 'kunde' ? (
              <>
                <strong>{eintrag.titel}</strong>
                {eintrag.vonTeam ? <span className="klein"> (vom Team geschrieben)</span> : null}
                <p>{eintrag.text}</p>
              </>
            ) : (
              <>
                <strong>{eintrag.autor}</strong>
                <p>{eintrag.text}</p>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Eingabe({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const ansagen = useAnsage();
  const [ziel, setZiel] = useState<'intern' | 'kunde'>('intern');
  const [titel, setTitel] = useState('');
  const [text, setText] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);

  const speichern = useMutation({
    mutationFn: async (): Promise<unknown> =>
      ziel === 'intern' ? api.notizHinzufuegen(orderId, text.trim()) : api.kundenNachricht(orderId, titel.trim(), text.trim()),
    onSuccess: () => {
      ansagen(ziel === 'intern' ? 'Interne Notiz gespeichert.' : 'Eintrag im Verlauf des Kunden gespeichert.');
      setTitel('');
      setText('');
      setZiel('intern');
    },
    onError: (e) => setFehler(e instanceof ApiFehler ? e.message : 'Das konnte nicht gespeichert werden. Bitte versuche es erneut.'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['versorgung', orderId] }),
  });

  const absenden = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || (ziel === 'kunde' && !titel.trim())) {
      setFehler(ziel === 'kunde' ? 'Bitte gib eine Überschrift und einen Text ein.' : 'Bitte schreibe eine Notiz.');
      return;
    }
    setFehler(null);
    speichern.mutate();
  };

  return (
    <form onSubmit={absenden} noValidate style={{ marginBottom: '1.25rem' }}>
      <fieldset>
        <legend>Neuer Eintrag</legend>
        <label className="auswahl">
          <input type="radio" name="ziel" checked={ziel === 'intern'} onChange={() => setZiel('intern')} />
          <span>Interne Notiz — sieht nur unser Team</span>
        </label>
        <label className="auswahl">
          <input type="radio" name="ziel" checked={ziel === 'kunde'} onChange={() => setZiel('kunde')} />
          <span>Nachricht im Verlauf des Kunden — erscheint in der App</span>
        </label>
      </fieldset>
      {fehler ? <Meldung art="fehler">{fehler}</Meldung> : null}
      {ziel === 'kunde' ? (
        <>
          <Meldung art="info">
            Der Kunde liest das in der App. Bitte freundlich und in Du-Form schreiben, keine internen Kürzel.
          </Meldung>
          <div className="feld">
            <label htmlFor="eintrag-titel">Überschrift</label>
            <input id="eintrag-titel" type="text" value={titel} onChange={(e) => setTitel(e.target.value)} maxLength={80} />
          </div>
        </>
      ) : null}
      <div className="feld">
        <label htmlFor="eintrag-text">{ziel === 'intern' ? 'Notiz' : 'Text'}</label>
        <textarea id="eintrag-text" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button type="submit" className="knopf knopf-primaer" disabled={speichern.isPending}>
        {speichern.isPending ? 'Wird gespeichert …' : ziel === 'intern' ? 'Notiz speichern' : 'Für den Kunden veröffentlichen'}
      </button>
    </form>
  );
}
