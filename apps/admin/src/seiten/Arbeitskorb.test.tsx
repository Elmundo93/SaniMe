import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aufgabe } from '../test/daten';
import { erwarteBarrierefrei, fetchAttrappe, PROFIL, rendereApp, wenn } from '../test/hilfen';

describe('Arbeitskorb', () => {
  const korb = [
    aufgabe({ id: 'n1', title: 'Notfalllieferung: Kunden zurückrufen', actionType: 'rueckruf', dringlichkeit: 'notfall', kundeName: 'Karl Eilig' }),
    aufgabe({ id: 'm1', assignedAdminId: PROFIL.id, assignedAdminName: 'Anna Admin', kundeName: 'Mia Meins' }),
    aufgabe({ id: 'f1', kundeName: 'Frida Frei' }),
  ];

  it('zeigt Aufgaben mit Dringlichkeit als Text, filtert und lässt Aufgaben übernehmen', async () => {
    const aufrufe = fetchAttrappe(
      wenn('GET', '/admin/auth/me', { body: PROFIL }),
      wenn('GET', '/admin/inbox', { body: korb }),
      wenn('POST', /\/admin\/actions\/f1\/uebernehmen$/, { status: 204 }),
    );
    const benutzer = userEvent.setup();
    const { container } = rendereApp('/');

    const tabelle = await screen.findByRole('table');
    const zeilen = within(tabelle).getAllByRole('row').slice(1);
    expect(zeilen).toHaveLength(3);
    expect(within(zeilen[0]).getByText('Notfall')).toBeInTheDocument();
    expect(within(zeilen[0]).getByRole('link', { name: 'Notfalllieferung: Kunden zurückrufen' })).toHaveAttribute('href', '/versorgungen/ord-1');
    await erwarteBarrierefrei(container);

    await benutzer.click(within(zeilen[2]).getByRole('button', { name: /Übernehmen/ }));
    expect(aufrufe.some((a) => a.methode === 'POST' && a.pfad.endsWith('/actions/f1/uebernehmen'))).toBe(true);

    await benutzer.click(screen.getByRole('link', { name: /Mir zugewiesen/ }));
    expect(await screen.findByText('Mia Meins')).toBeInTheDocument();
    expect(screen.queryByText('Frida Frei')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mir zugewiesen/ })).toHaveAttribute('aria-current', 'page');
  });

  it('sagt „Alles erledigt“, wenn nichts offen ist', async () => {
    fetchAttrappe(wenn('GET', '/admin/auth/me', { body: PROFIL }), wenn('GET', '/admin/inbox', { body: [] }));
    rendereApp('/');
    expect(await screen.findByText('Alles erledigt.')).toBeInTheDocument();
  });

  it('versteckt Schreibaktionen für Personen mit Leserechten', async () => {
    fetchAttrappe(wenn('GET', '/admin/auth/me', { body: { ...PROFIL, permissions: ['orders:read'] } }), wenn('GET', '/admin/inbox', { body: korb }));
    rendereApp('/');
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /Übernehmen/ })).not.toBeInTheDocument();
  });
});
