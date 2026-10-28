import { generateKeyPairSync, verify } from 'node:crypto';
import { TelekomVerifyClient } from './telekom-verify.client';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

function client(stillePruefung = false) {
  return new TelekomVerifyClient({ applicationId: 'app-1', privateKey: PEM, baseUrl: 'https://verify.test', stillePruefung, sandbox: false });
}

function antwort(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) } as Response;
}

describe('TelekomVerifyClient', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('starts an SMS-only verification with a signed application JWT', async () => {
    fetchMock.mockResolvedValue(antwort(202, { request_id: 'r1' }));
    const start = await client().start('+4915123456789');
    expect(start).toEqual({ requestId: 'r1', checkUrl: undefined });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://verify.test/v2/verify');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ brand: 'SaniMe', locale: 'de-de', code_length: 6, workflow: [{ channel: 'sms', to: '4915123456789' }] });

    const [kopf, inhalt, signatur] = init.headers.Authorization.replace('Bearer ', '').split('.');
    expect(verify('RSA-SHA256', Buffer.from(`${kopf}.${inhalt}`), publicKey, Buffer.from(signatur, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(inhalt, 'base64url').toString())).toMatchObject({ application_id: 'app-1' });
  });

  it('puts the network check first and returns its check_url', async () => {
    fetchMock.mockResolvedValue(antwort(202, { request_id: 'r2', check_url: 'https://check.test/x' }));
    const start = await client(true).start('+4915123456789');
    expect(start.checkUrl).toBe('https://check.test/x');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).workflow.map((w: { channel: string }) => w.channel)).toEqual(['silent_auth', 'sms']);
  });

  it('treats a wrong code as false and a running verification as conflict', async () => {
    fetchMock.mockResolvedValueOnce(antwort(200, { status: 'completed' }));
    expect(await client().pruefe('r1', '123456')).toBe(true);
    fetchMock.mockResolvedValueOnce(antwort(400, { title: 'Invalid Code' }));
    expect(await client().pruefe('r1', '000000')).toBe(false);
    fetchMock.mockResolvedValueOnce(antwort(409, { title: 'Conflict' }));
    await expect(client().start('+4915123456789')).rejects.toThrow(/läuft schon eine Bestätigung/);
    fetchMock.mockResolvedValueOnce(antwort(500, {}));
    await expect(client().start('+4915123456789')).rejects.toThrow(/gerade nicht möglich/);
  });
});
