import type { SupplyEvent } from '@sanime/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { api, type VersorgungsDetail } from '../../api/admin';
import { ApiFehler } from '../../api/client';
import { useAnsage } from '../../komponenten/Ansage';
import { Dialog } from '../../komponenten/Dialog';
import { Meldung } from '../../komponenten/Meldung';
import { AKTIONEN, schritteFuer, STATUS } from '../../fachtexte';

type Ereignis = SupplyEvent['type'];

// Eine hervorgehobene Aktion (der übliche nächste Schritt), alles andere
// unter „Weitere Möglichkeiten“. Jeder Statuswechsel ist endgültig (die
// Übergangstabelle kennt keinen Rückweg) und kann den Kunden benachrichtigen —
// deshalb immer ein Bestätigungsdialog, der genau das vorher sagt.
export function NaechsterSchritt({ detail, darfSchreiben }: { detail: VersorgungsDetail; darfSchreiben: boolean }) {
  const queryClient = useQueryClient();
  const ansagen = useAnsage();
  const [gewaehlt, setGewaehlt] = useState<Ereignis | null>(null);
  const [begruendung, setBegruendung] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [konflikt, setKonflikt] = useState<string | null>(null);
  const titelId = useId();
  const status = detail.supply.status;
  const { haupt, weitere } = schritteFuer(status);
  const text = gewaehlt ? AKTIONEN[gewaehlt]! : null;

  const setzen = useMutation({
    mutationFn: async (ereignis: Ereignis) => {
      if (AKTIONEN[ereignis]?.begruendungPflicht) {
        await api.notizHinzufuegen(detail.order.id, `${AKTIONEN[ereignis]!.label}: ${begruendung.trim()}`);
      }
      return api.statusSetzen(detail.order.id, ereignis, status);
    },
    onSuccess: (ergebnis) => {
      setGewaehlt(null);
      setBegruendung('');
      ansagen(`Status auf „${STATUS[ergebnis.status].label}“ gesetzt.`);
    },
    onError: (e) => {
      if (e instanceof ApiFehler && e.status === 409) {
        setGewaehlt(null);
        setKonflikt(e.message);
        ansagen(e.message, true);
      } else {
        setFehler(e instanceof ApiFehler ? e.message : 'Der Status konnte nicht gesetzt werden. Bitte versuche es erneut.');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['versorgung', detail.order.id] });
      queryClient.invalidateQueries({ queryKey: ['arbeitskorb'] });
      queryClient.invalidateQueries({ queryKey: ['versorgungen'] });
    },
  });

  const oeffnen = (ereignis: Ereignis) => {
    setFehler(null);
    setKonflikt(null);
    setBegruendung('');
    setGewaehlt(ereignis);
  };

  const bestaetigen = (event: FormEvent) => {
    event.preventDefault();
    if (!gewaehlt) return;
    if (AKTIONEN[gewaehlt]?.begruendungPflicht && !begruendung.trim()) {
      setFehler('Bitte notiere kurz den Grund. Die Notiz sieht nur unser Team.');
      return;
    }
    setzen.mutate(gewaehlt);
  };

  return (
    <section className="karte naechster-schritt" aria-labelledby={titelId}>
      <h2 id={titelId}>Nächster Schritt</h2>
      {konflikt ? <Meldung art="warnung">{konflikt}</Meldung> : null}
      {!haupt && weitere.length === 0 ? <p>Für diese Versorgung ist nichts mehr zu tun.</p> : null}
      {haupt ? (
        <>
          <p>{AKTIONEN[haupt]!.erklaerung}</p>
          <p className="folgen">
            <strong>Das erfährt der Kunde:</strong> {AKTIONEN[haupt]!.kunde}
          </p>
          {darfSchreiben ? (
            <button type="button" className="knopf knopf-primaer" onClick={() => oeffnen(haupt)}>
              {AKTIONEN[haupt]!.label} …
            </button>
          ) : (
            <p className="klein">Du hast nur Leserechte.</p>
          )}
        </>
      ) : null}
      {darfSchreiben && weitere.length > 0 ? (
        <details>
          <summary>Weitere Möglichkeiten</summary>
          <ul className="liste-schlicht">
            {weitere.map((ereignis) => (
              <li key={ereignis}>
                <button
                  type="button"
                  className={`knopf${AKTIONEN[ereignis]!.gefahr ? ' knopf-gefahr' : ''}`}
                  onClick={() => oeffnen(ereignis)}
                >
                  {AKTIONEN[ereignis]!.label} …
                </button>
                <p className="klein" style={{ marginTop: '0.375rem' }}>
                  {AKTIONEN[ereignis]!.erklaerung}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Dialog
        offen={gewaehlt !== null}
        titel={text ? `${text.label}?` : ''}
        beschreibung={
          text ? (
            <>
              <p>{text.erklaerung}</p>
              <p>
                <strong>Das erfährt der Kunde:</strong> {text.kunde}
              </p>
              <p>Dieser Schritt lässt sich nicht rückgängig machen.</p>
            </>
          ) : null
        }
        onSchliessen={() => setGewaehlt(null)}
      >
        <form onSubmit={bestaetigen} noValidate>
          {fehler ? <Meldung art="fehler">{fehler}</Meldung> : null}
          {text?.begruendungPflicht ? (
            <div className="feld">
              <label htmlFor="begruendung">Grund (interne Notiz, Pflichtfeld)</label>
              <textarea
                id="begruendung"
                value={begruendung}
                onChange={(e) => setBegruendung(e.target.value)}
                aria-invalid={fehler && !begruendung.trim() ? true : undefined}
                required
              />
            </div>
          ) : null}
          <div className="knopfreihe">
            <button
              type="submit"
              className={`knopf knopf-primaer${text?.gefahr ? ' knopf-gefahr' : ''}`}
              disabled={setzen.isPending}
              autoFocus={!text?.gefahr && !text?.begruendungPflicht}
            >
              {setzen.isPending ? 'Wird gespeichert …' : text?.label}
            </button>
            <button type="button" className="knopf" onClick={() => setGewaehlt(null)} autoFocus={Boolean(text?.gefahr && !text.begruendungPflicht)}>
              Abbrechen
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
