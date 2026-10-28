import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Link, useParams } from 'react-router';
import { api, type VersorgungsDetail } from '../../api/admin';
import { ApiFehler } from '../../api/client';
import { Etikett, StatusEtikett } from '../../komponenten/Etikett';
import { Laedt, Meldung } from '../../komponenten/Meldung';
import { Seite } from '../../komponenten/Seite';
import { datum, datumZeit, euro, fristText } from '../../fachtexte';
import { useSitzung } from '../../sitzung/Sitzung';
import { Aufgaben } from './Aufgaben';
import { NaechsterSchritt } from './NaechsterSchritt';
import { Notfall } from './Notfall';
import { Verlauf } from './Verlauf';

function kundenname(detail: VersorgungsDetail) {
  if (detail.kunde) return `${detail.kunde.vorname} ${detail.kunde.nachname}`.trim();
  return detail.rezept?.patientName || 'Ohne Kundenkonto';
}

export function Versorgung() {
  const { orderId = '' } = useParams();
  const sitzung = useSitzung();
  const darfSchreiben = sitzung.darf('orders:write');
  const detail = useQuery({ queryKey: ['versorgung', orderId], queryFn: () => api.versorgung(orderId) });

  if (detail.isLoading) return <Laedt was="Die Versorgung" />;
  if (detail.error || !detail.data) {
    const nichtGefunden = detail.error instanceof ApiFehler && (detail.error.status === 404 || detail.error.status === 400);
    return (
      <Seite titel={nichtGefunden ? 'Versorgung nicht gefunden' : 'Versorgung konnte nicht geladen werden'}>
        <Meldung art="fehler">
          {nichtGefunden
            ? 'Diese Versorgung gibt es nicht (mehr). Bitte suche sie in der Liste.'
            : detail.error instanceof ApiFehler
              ? detail.error.message
              : 'Bitte lade die Seite neu.'}
        </Meldung>
        <Link to="/versorgungen">Zur Liste der Versorgungen</Link>
      </Seite>
    );
  }

  const d = detail.data;
  const name = kundenname(d);

  return (
    <Seite titel={name} unterzeile={<Link to="/versorgungen">← Alle Versorgungen</Link>}>
      <dl className="kopfdaten">
        <div>
          <dt>Status:</dt>
          <dd>
            <StatusEtikett status={d.supply.status} />
          </dd>
        </div>
        <div>
          <dt>Produkt:</dt>
          <dd>{d.supply.productNameSnapshot}</dd>
        </div>
        <div>
          <dt>Krankenkasse:</dt>
          <dd>{d.supply.insurerNameSnapshot || '–'}</dd>
        </div>
        <div>
          <dt>Eingang:</dt>
          <dd>{datum(d.order.createdAt)}</dd>
        </div>
        {d.fristBis ? (
          <div>
            <dt>Antwort der Kasse:</dt>
            <dd>{fristText(d.fristBis)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Bestellnummer:</dt>
          <dd>{d.order.id.slice(0, 8)}</dd>
        </div>
      </dl>

      <div className="detail">
        <div>
          {d.notfall ? <Notfall detail={d} darfSchreiben={darfSchreiben} /> : null}
          <NaechsterSchritt detail={d} darfSchreiben={darfSchreiben} />
          <Aufgaben detail={d} ich={sitzung.profil!.id} darfSchreiben={darfSchreiben} />
          <KundeKarte detail={d} />
          <VersorgungKarte detail={d} />
          <RezeptKarte detail={d} />
        </div>
        <div>
          <Verlauf detail={d} darfSchreiben={darfSchreiben} />
        </div>
      </div>
    </Seite>
  );
}

function Karte({ titel, children }: { titel: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section className="karte" aria-labelledby={id}>
      <h2 id={id}>{titel}</h2>
      {children}
    </section>
  );
}

function KundeKarte({ detail }: { detail: VersorgungsDetail }) {
  const { kunde, lieferadresse } = detail;
  return (
    <Karte titel="Kunde und Lieferung">
      {!kunde ? <p>Noch kein Kundenkonto verknüpft. Die Daten unten stammen vom Rezept.</p> : null}
      <dl className="datenliste">
        {kunde ? (
          <>
            <dt>Telefon</dt>
            <dd>{kunde.telefon ? <a href={`tel:${kunde.telefon.replace(/[^\d+]/g, '')}`}>{kunde.telefon}</a> : 'Nicht hinterlegt'}</dd>
            <dt>E-Mail</dt>
            <dd>{kunde.email ? <a href={`mailto:${kunde.email}`}>{kunde.email}</a> : 'Nicht hinterlegt'}</dd>
            <dt>Versichertennr.</dt>
            <dd>{kunde.versichertennummer}</dd>
            {kunde.geburtsdatum ? (
              <>
                <dt>Geburtsdatum</dt>
                <dd>{kunde.geburtsdatum}</dd>
              </>
            ) : null}
          </>
        ) : null}
        <dt>Lieferadresse</dt>
        <dd>
          {lieferadresse ? (
            <>
              {lieferadresse.strasse}
              <br />
              {lieferadresse.plz} {lieferadresse.ort}
            </>
          ) : (
            'Nicht hinterlegt'
          )}
        </dd>
        {detail.appointment ? (
          <>
            <dt>Termin</dt>
            <dd>
              {datumZeit(detail.appointment.scheduledStart)} bis{' '}
              {new Date(detail.appointment.scheduledEnd).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}{' '}
              Uhr
            </dd>
          </>
        ) : null}
      </dl>
    </Karte>
  );
}

function VersorgungKarte({ detail }: { detail: VersorgungsDetail }) {
  const s = detail.supply;
  return (
    <Karte titel="Versorgung">
      <dl className="datenliste">
        <dt>Produkt</dt>
        <dd>
          {s.productNameSnapshot}
          {s.manufacturerNameSnapshot ? <span className="klein"> · {s.manufacturerNameSnapshot}</span> : null}
        </dd>
        <dt>Abrechnung</dt>
        <dd>
          {s.hilfsmittelNrSnapshot ? (
            <>Krankenkasse (Hilfsmittelnr. {s.hilfsmittelNrSnapshot})</>
          ) : (
            <Etikett ton="neutral">Selbstzahler</Etikett>
          )}
        </dd>
        {s.hilfsmittelNrSnapshot ? (
          <>
            <dt>Zuzahlung</dt>
            <dd>{euro(s.customerCopaySnapshotCents)} (wird nach der Lieferung eingezogen)</dd>
          </>
        ) : null}
        <dt>Lieferant</dt>
        <dd>{detail.lieferant ? `${detail.lieferant.name} (Lieferzeit ca. ${detail.lieferant.lieferzeitTage} Werktage)` : 'Noch offen'}</dd>
        {s.insuranceSubmittedAt ? (
          <>
            <dt>Antrag versendet</dt>
            <dd>{datum(s.insuranceSubmittedAt)}</dd>
          </>
        ) : null}
        {s.insuranceDecidedAt ? (
          <>
            <dt>Kasse entschieden</dt>
            <dd>{datum(s.insuranceDecidedAt)}</dd>
          </>
        ) : null}
      </dl>
    </Karte>
  );
}

function RezeptKarte({ detail }: { detail: VersorgungsDetail }) {
  const r = detail.rezept;
  if (!r) {
    return (
      <Karte titel="Rezept">
        <p>Zu dieser Versorgung gibt es kein Rezept (Selbstzahler oder ohne Rezept gekauft).</p>
      </Karte>
    );
  }
  return (
    <Karte titel="Rezept">
      <p className="klein">
        Per Texterkennung vom Foto gelesen{r.vomKundenKorrigiert ? ' und vom Kunden korrigiert' : ''}. Bitte vor dem Antrag mit dem
        Original-Rezept abgleichen.
      </p>
      <dl className="datenliste">
        <dt>Patient</dt>
        <dd>
          {r.patientName}, geb. {r.patientGeburtsdatum}
        </dd>
        {r.strasse || r.ort ? (
          <>
            <dt>Adresse</dt>
            <dd>
              {r.strasse}
              {r.strasse ? <br /> : null}
              {r.plz} {r.ort}
            </dd>
          </>
        ) : null}
        <dt>Verordnet</dt>
        <dd>
          {r.hilfsmittel}
          {r.hilfsmittelNr ? <span className="klein"> ({r.hilfsmittelNr})</span> : null}
        </dd>
        <dt>Diagnose</dt>
        <dd>{r.diagnose || '–'}</dd>
        <dt>Arzt</dt>
        <dd>
          {r.arzt}
          {r.lanr ? <span className="klein"> · LANR {r.lanr}</span> : null}
        </dd>
        <dt>Ausgestellt</dt>
        <dd>{r.ausstellungsdatum || '–'}</dd>
      </dl>
    </Karte>
  );
}
