import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { erwarteBarrierefrei, fetchAttrappe, ort, PROFIL, rendereApp, wenn } from '../test/hilfen';

describe('Anmeldung', () => {
  it('leitet ohne Sitzung zur Anmeldung und führt durch die 2FA-Einrichtung', async () => {
    let angemeldet = false;
    const aufrufe = fetchAttrappe(
      wenn('GET', '/admin/auth/me', () => (angemeldet ? { body: PROFIL } : { status: 401, body: { message: 'Unauthorized' } })),
      wenn('POST', '/admin/auth/login', {
        body: { schritt: 'einrichten', challengeToken: 'tok', geheimnis: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' },
      }),
      wenn('POST', '/admin/auth/code', () => {
        angemeldet = true;
        return { body: PROFIL };
      }),
      wenn('GET', '/admin/inbox', { body: [] }),
    );
    const benutzer = userEvent.setup();
    const { container } = rendereApp('/versorgungen');

    expect(await screen.findByRole('heading', { name: 'Anmelden', level: 1 })).toHaveFocus();
    expect(ort.suche).toBe('?weiter=%2Fversorgungen');
    await erwarteBarrierefrei(container);

    await benutzer.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByText(/Bitte gib deine E-Mail-Adresse und dein Passwort ein/).closest('[role=alert]')).toBeInTheDocument();

    await benutzer.type(screen.getByLabelText('E-Mail-Adresse'), 'anna@example.com');
    await benutzer.type(screen.getByLabelText('Passwort'), 'geheim');
    await benutzer.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(await screen.findByRole('heading', { name: 'Zweiten Faktor einrichten' })).toHaveFocus();
    // Der Schlüssel steht als Text da — Alternative zum QR-Code für alle, die ihn nicht scannen können.
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    await erwarteBarrierefrei(container);

    await benutzer.type(screen.getByLabelText('6-stelliger Code'), '123 456');
    await benutzer.click(screen.getByRole('button', { name: 'Einrichten und anmelden' }));

    expect(await screen.findByRole('heading', { name: 'Versorgungen', level: 1 })).toBeInTheDocument();
    expect(aufrufe.find((a) => a.pfad === '/api/v1/admin/auth/code')?.body).toEqual({ challengeToken: 'tok', code: '123456' });
    expect(aufrufe.every((a) => a.headers['X-SaniMe-Admin'] === '1')).toBe(true);
  });

  it('zeigt die Meldung des Servers bei falschem Passwort und leert das Passwortfeld', async () => {
    fetchAttrappe(
      wenn('GET', '/admin/auth/me', { status: 401, body: {} }),
      wenn('POST', '/admin/auth/login', { status: 401, body: { message: 'E-Mail oder Passwort ist falsch' } }),
    );
    const benutzer = userEvent.setup();
    rendereApp('/');
    await benutzer.type(await screen.findByLabelText('E-Mail-Adresse'), 'anna@example.com');
    await benutzer.type(screen.getByLabelText('Passwort'), 'falsch');
    await benutzer.click(screen.getByRole('button', { name: 'Weiter' }));

    expect((await screen.findByText(/E-Mail oder Passwort ist falsch/)).closest('[role=alert]')).toBeInTheDocument();
    expect(screen.getByLabelText('Passwort')).toHaveValue('');
    expect(screen.getByLabelText('E-Mail-Adresse')).toHaveFocus();
  });
});
