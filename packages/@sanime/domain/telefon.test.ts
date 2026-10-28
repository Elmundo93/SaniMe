import { normalisiereMobilnummer } from './telefon';

describe('normalisiereMobilnummer', () => {
  it.each([
    ['0151 23456789', '+4915123456789'],
    ['+49 (0)151-234 567 89'.replace('(0)', ''), '+4915123456789'],
    ['0049 170 1234567', '+491701234567'],
    ['49 160 1234567', '+491601234567'],
  ])('%s → %s', (eingabe, erwartet) => {
    expect(normalisiereMobilnummer(eingabe)).toBe(erwartet);
  });

  it.each(['030 1234567', '+43 660 1234567', '0151', 'abc', ''])('lehnt %s ab', (eingabe) => {
    expect(normalisiereMobilnummer(eingabe)).toBeNull();
  });
});
