import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { detail } from '../../test/daten';
import { erwarteBarrierefrei, fetchAttrappe, PROFIL, rendereApp, wenn } from '../../test/hilfen';

const BASIS = [wenn('GET', '/admin/auth/me', { body: PROFIL }), wenn('GET', '/admin/inbox', { body: [] })];

describe('Versorgung (Detail)', () => {
  it('zeigt den nächsten Schritt mit seinen Folgen und setzt den Status erst nach Bestätigung', async () => {
    const aufrufe = fetchAttrappe(
      ...BASIS,
      wenn('GET', '/admin/orders/ord-1', { body: detail() }),
      wenn('PATCH', '/admin/orders/ord-1/status', { body: { status: 'insurance_review' } }),
    );
    const benutzer = userEvent.setup();
    const { container } = rendereApp('/versorgungen/ord-1');

    expect(await screen.findByRole('heading', { name: 'Erika Muster', level: 1 })).toHaveFocus();
    const schritt = screen.getByRole('region', { name: 'Nächster Schritt' });
    expect(within(schritt).getByText(/Push-Nachricht „Antrag versendet“/)).toBeInTheDocument();
    await erwarteBarrierefrei(container);

    await benutzer.click(within(schritt).getByRole('button', { name: 'Antrag als versendet markieren …' }));
    const dialog = screen.getByRole('dialog', { name: 'Antrag als versendet markieren?' });
    expect(within(dialog).getByText('Dieser Schritt lässt sich nicht rückgängig machen.')).toBeInTheDocument();
    expect(aufrufe.some((a) => a.methode === 'PATCH')).toBe(false);

    await benutzer.click(within(dialog).getByRole('button', { name: 'Antrag als versendet markieren' }));
    const patch = aufrufe.find((a) => a.methode === 'PATCH');
    expect(patch?.body).toEqual({ type: 'AntragVersendet', erwarteterStatus: 'submitted' });
  });

  it('meldet einen Konflikt verständlich, wenn jemand anderes schneller war', async () => {
    fetchAttrappe(
      ...BASIS,
      wenn('GET', '/admin/orders/ord-1', { body: detail() }),
      wenn('PATCH', '/admin/orders/ord-1/status', {
        status: 409,
        body: { message: 'Diese Versorgung wurde inzwischen von jemand anderem bearbeitet. Bitte prüfe den aktuellen Stand und entscheide dann erneut.' },
      }),
    );
    const benutzer = userEvent.setup();
    rendereApp('/versorgungen/ord-1');
    await benutzer.click(await screen.findByRole('button', { name: 'Antrag als versendet markieren …' }));
    await benutzer.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Antrag als versendet markieren' }));
    expect((await screen.findAllByText(/von jemand anderem bearbeitet/)).length).toBeGreaterThan(0);
  });

  it('verlangt für eine Ablehnung eine Begründung als interne Notiz', async () => {
    const aufrufe = fetchAttrappe(
      ...BASIS,
      wenn('GET', '/admin/orders/ord-1', { body: detail({}, { status: 'insurance_review', insuranceSubmittedAt: new Date().toISOString() }) }),
      wenn('POST', '/admin/orders/ord-1/notes', { status: 201, body: {} }),
      wenn('PATCH', '/admin/orders/ord-1/status', { body: { status: 'rejected' } }),
    );
    const benutzer = userEvent.setup();
    rendereApp('/versorgungen/ord-1');

    await benutzer.click(await screen.findByText('Weitere Möglichkeiten'));
    await benutzer.click(screen.getByRole('button', { name: 'Ablehnung eintragen …' }));
    const dialog = screen.getByRole('dialog', { name: 'Ablehnung eintragen?' });
    await benutzer.click(within(dialog).getByRole('button', { name: 'Ablehnung eintragen' }));
    expect(within(dialog).getByText(/Bitte notiere kurz den Grund/)).toBeInTheDocument();
    expect(aufrufe.some((a) => a.methode === 'PATCH')).toBe(false);

    await benutzer.type(within(dialog).getByLabelText(/Grund/), 'Kasse verlangt Gutachten');
    await benutzer.click(within(dialog).getByRole('button', { name: 'Ablehnung eintragen' }));
    expect(aufrufe.find((a) => a.pfad.endsWith('/notes'))?.body).toEqual({ body: 'Ablehnung eintragen: Kasse verlangt Gutachten' });
    expect(aufrufe.find((a) => a.methode === 'PATCH')?.body).toEqual({ type: 'InsuranceRejected', erwarteterStatus: 'insurance_review' });
  });

  it('zeigt eine Notfallanfrage oben und speichert das Rückruf-Ergebnis', async () => {
    const aufrufe = fetchAttrappe(
      ...BASIS,
      wenn('GET', '/admin/orders/ord-1', {
        body: detail({ notfall: { id: 'nf-1', grund: 'STURZGEFAHR', erreichbarkeit: 'VORMITTAG', telefon: null, createdAt: new Date().toISOString() } }),
      }),
      wenn('POST', '/admin/urgent-deliveries/nf-1/rueckruf', { body: { abgeschlossen: true, label: 'Notfalllieferung zugesagt' } }),
    );
    const benutzer = userEvent.setup();
    const { container } = rendereApp('/versorgungen/ord-1');

    const notfall = await screen.findByRole('region', { name: /Kunde bittet um Rückruf/ });
    expect(within(notfall).getByText('Sturzgefahr oder Unsicherheit im Alltag')).toBeInTheDocument();
    expect(within(notfall).getByRole('link', { name: '0151 0000000' })).toHaveAttribute('href', 'tel:01510000000');
    await erwarteBarrierefrei(container);

    await benutzer.click(within(notfall).getByLabelText('Notfalllieferung zugesagt'));
    await benutzer.click(within(notfall).getByRole('button', { name: 'Ergebnis speichern' }));
    expect(aufrufe.find((a) => a.pfad.endsWith('/rueckruf'))?.body).toEqual({ ergebnis: 'ZUGESAGT' });
  });

  it('trennt im Verlauf klar zwischen intern und für den Kunden sichtbar', async () => {
    const aufrufe = fetchAttrappe(
      ...BASIS,
      wenn('GET', '/admin/orders/ord-1', { body: detail() }),
      wenn('POST', '/admin/orders/ord-1/timeline', { status: 201, body: {} }),
    );
    const benutzer = userEvent.setup();
    rendereApp('/versorgungen/ord-1');

    const verlauf = await screen.findByRole('region', { name: 'Verlauf und Notizen' });
    expect(within(verlauf).getByText('Intern')).toBeInTheDocument();
    expect(within(verlauf).getByText('Sieht der Kunde')).toBeInTheDocument();

    await benutzer.click(within(verlauf).getByLabelText(/Nachricht im Verlauf des Kunden/));
    await benutzer.type(within(verlauf).getByLabelText('Überschrift'), 'Rückfrage');
    await benutzer.type(within(verlauf).getByLabelText('Text'), 'Wir melden uns morgen bei dir.');
    await benutzer.click(within(verlauf).getByRole('button', { name: 'Für den Kunden veröffentlichen' }));
    expect(aufrufe.find((a) => a.pfad.endsWith('/timeline'))?.body).toEqual({ label: 'Rückfrage', description: 'Wir melden uns morgen bei dir.' });
  });
});
