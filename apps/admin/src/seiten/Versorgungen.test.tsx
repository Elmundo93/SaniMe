import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { erwarteBarrierefrei, fetchAttrappe, ort, PROFIL, rendereApp, wenn } from '../test/hilfen';

describe('Versorgungen', () => {
  it('sucht über die URL und filtert nach Statusgruppe', async () => {
    const aufrufe = fetchAttrappe(
      wenn('GET', '/admin/auth/me', { body: PROFIL }),
      wenn('GET', '/admin/inbox', { body: [] }),
      wenn('GET', '/admin/orders', {
        body: {
          gesamt: 1,
          eintraege: [
            {
              orderId: 'ord-12345678',
              supplyId: 'sup-1',
              status: 'insurance_review',
              createdAt: '2026-10-20T10:00:00Z',
              updatedAt: '2026-10-21T10:00:00Z',
              kundeName: 'Erika Muster',
              produktName: 'Rollator (Platzhalter)',
              kasse: 'Beispiel-BKK',
              selbstzahler: false,
              insuranceSubmittedAt: '2026-10-21T10:00:00Z',
            },
          ],
        },
      }),
    );
    const benutzer = userEvent.setup();
    const { container } = rendereApp('/versorgungen');

    const tabelle = await screen.findByRole('table');
    expect(within(tabelle).getByRole('link', { name: 'Erika Muster' })).toHaveAttribute('href', '/versorgungen/ord-12345678');
    expect(within(tabelle).getByText('Bei der Krankenkasse')).toBeInTheDocument();
    await erwarteBarrierefrei(container);

    await benutzer.type(screen.getByLabelText('Suchbegriff'), 'Muster');
    await benutzer.selectOptions(screen.getByLabelText('Status'), 'kasse');
    await benutzer.click(screen.getByRole('button', { name: 'Suchen' }));

    expect(ort.suche).toBe('?q=Muster&gruppe=kasse');
    expect(aufrufe.at(-1)?.pfad).toBe('/api/v1/admin/orders?limit=25&offset=0&q=Muster&status=insurance_review');
  });
});
