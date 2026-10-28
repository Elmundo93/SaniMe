import { ERREICHBARKEITEN, NOTFALL_ERGEBNISSE, NOTFALL_GRUENDE, type NotfallErgebnis } from '@sanime/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { api, type VersorgungsDetail } from '../../api/admin';
import { ApiFehler } from '../../api/client';
import { useAnsage } from '../../komponenten/Ansage';
import { Etikett } from '../../komponenten/Etikett';
import { Meldung } from '../../komponenten/Meldung';
import { datumZeit, seit } from '../../fachtexte';

function textAus<T extends Record<string, string>>(tabelle: T, schluessel: string) {
  return schluessel in tabelle ? tabelle[schluessel as keyof T] : schluessel;
}

// Rückrufbitte des Kunden: Grund, Erreichbarkeit, Nummer — und das Ergebnis
// als feste Auswahl. „Nicht erreicht“ lässt die Bitte offen.
export function Notfall({ detail, darfSchreiben }: { detail: VersorgungsDetail; darfSchreiben: boolean }) {
  const notfall = detail.notfall!;
  const queryClient = useQueryClient();
  const ansagen = useAnsage();
  const titelId = useId();
  const [ergebnis, setErgebnis] = useState<NotfallErgebnis | ''>('');
  const [fehler, setFehler] = useState<string | null>(null);
  const telefon = notfall.telefon ?? detail.kunde?.telefon ?? null;

  const speichern = useMutation({
    mutationFn: (wahl: NotfallErgebnis) => api.rueckruf(notfall.id, wahl),
    onSuccess: (antwort) => {
      setErgebnis('');
      ansagen(antwort.abgeschlossen ? `Rückruf gespeichert: ${antwort.label}.` : 'Gespeichert. Die Rückrufbitte bleibt offen.');
    },
    onError: (e) => setFehler(e instanceof ApiFehler ? e.message : 'Das Ergebnis konnte nicht gespeichert werden. Bitte versuche es erneut.'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['versorgung', detail.order.id] });
      queryClient.invalidateQueries({ queryKey: ['arbeitskorb'] });
    },
  });

  const absenden = (event: FormEvent) => {
    event.preventDefault();
    if (!ergebnis) {
      setFehler('Bitte wähle aus, wie der Rückruf ausgegangen ist.');
      return;
    }
    setFehler(null);
    speichern.mutate(ergebnis);
  };

  return (
    <section className="karte" aria-labelledby={titelId} style={{ borderColor: 'var(--kritisch)', borderWidth: 2 }}>
      <h2 id={titelId}>
        <Etikett ton="kritisch" symbol="!">
          Notfall
        </Etikett>{' '}
        Kunde bittet um Rückruf
      </h2>
      <dl className="datenliste">
        <dt>Grund</dt>
        <dd>{textAus(NOTFALL_GRUENDE, notfall.grund)}</dd>
        <dt>Erreichbar</dt>
        <dd>{textAus(ERREICHBARKEITEN, notfall.erreichbarkeit)}</dd>
        <dt>Telefon</dt>
        <dd>{telefon ? <a href={`tel:${telefon.replace(/[^\d+]/g, '')}`}>{telefon}</a> : 'Keine Nummer hinterlegt'}</dd>
        <dt>Angefragt</dt>
        <dd>
          {datumZeit(notfall.createdAt)} ({seit(notfall.createdAt)})
        </dd>
      </dl>
      {darfSchreiben ? (
        <form onSubmit={absenden} noValidate style={{ marginTop: '1rem' }}>
          {fehler ? <Meldung art="fehler">{fehler}</Meldung> : null}
          <fieldset>
            <legend>Ergebnis des Rückrufs</legend>
            {(Object.keys(NOTFALL_ERGEBNISSE) as NotfallErgebnis[]).map((schluessel) => (
              <label key={schluessel} className="auswahl">
                <input
                  type="radio"
                  name="rueckruf-ergebnis"
                  value={schluessel}
                  checked={ergebnis === schluessel}
                  onChange={() => setErgebnis(schluessel)}
                />
                <span>{NOTFALL_ERGEBNISSE[schluessel]}</span>
              </label>
            ))}
          </fieldset>
          <p className="klein">
            Bei „zugesagt“ oder „geklärt“ sieht der Kunde einen Eintrag im Verlauf. Details zum Gespräch bitte als interne Notiz festhalten.
          </p>
          <button type="submit" className="knopf knopf-primaer" disabled={speichern.isPending}>
            {speichern.isPending ? 'Wird gespeichert …' : 'Ergebnis speichern'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
