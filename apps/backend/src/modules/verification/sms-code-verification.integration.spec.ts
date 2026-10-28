import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import { createDatabase, createPool } from '../../db/client';
import type { SmsSender } from './ports/sms-sender.port';
import { SmsCodeVerificationProvider } from './providers/sms-code-verification.provider';
import { VerificationCodesRepository } from './verification-codes.repository';

describe('SmsCodeVerificationProvider (integration)', () => {
  let pool: Pool;
  let codes: VerificationCodesRepository;
  const config = new ConfigService({ VERIFICATION_CODE_PEPPER: 'test-pepper' });
  let nummer = 0;
  const neueNummer = () => `+49151${String(Date.now()).slice(-6)}${String(++nummer).padStart(2, '0')}`;

  beforeAll(() => {
    pool = createPool(process.env.DATABASE_URL!);
    codes = new VerificationCodesRepository(createDatabase(pool));
  });

  afterAll(async () => {
    await pool.end();
  });

  function provider(echterVersand: boolean) {
    const gesendet: { to: string; text: string }[] = [];
    const sms: SmsSender = { echterVersand, send: async (to, text) => void gesendet.push({ to, text }) };
    return { verification: new SmsCodeVerificationProvider(codes, config, sms), gesendet };
  }

  it('sends the code by SMS and only echoes it without a real sender', async () => {
    const dev = provider(false);
    const target = neueNummer();
    const { devCode } = await dev.verification.sendCode(target, 'test');
    expect(dev.gesendet[0].text).toContain(devCode!);
    expect(await dev.verification.verifyCode(target, 'test', devCode!)).toBe(true);

    const echt = provider(true);
    const result = await echt.verification.sendCode(neueNummer(), 'test');
    expect(result.devCode).toBeUndefined();
    expect(echt.gesendet[0].text).toMatch(/^\d{6} ist dein SaniMe-Bestätigungscode/);
  });

  it('enforces 30 seconds between codes and at most three per hour', async () => {
    const { verification } = provider(true);
    const target = neueNummer();
    await verification.sendCode(target, 'test');
    await expect(verification.sendCode(target, 'test')).rejects.toThrow(/Bitte warte noch \d+ Sekunden/);

    // Ältere Codes derselben Stunde zählen mit — zurückdatiert statt zu warten.
    await pool.query(`update verification_codes set created_at = now() - interval '40 minutes' where target = $1`, [target]);
    await verification.sendCode(target, 'test');
    await pool.query(`update verification_codes set created_at = now() - interval '40 minutes' where target = $1`, [target]);
    await verification.sendCode(target, 'test');
    await pool.query(`update verification_codes set created_at = now() - interval '40 minutes' where target = $1`, [target]);
    await expect(verification.sendCode(target, 'test')).rejects.toThrow(/in einer Stunde/);
  });
});
