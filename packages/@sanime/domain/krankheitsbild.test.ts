import { findeKrankheitsbild, matcheKrankheitsbild } from './krankheitsbild';

describe('matcheKrankheitsbild', () => {
  it('matches a transcript containing a known synonym', () => {
    const result = matcheKrankheitsbild('Ich habe Probleme beim Gehen und brauche einen Rollator');
    expect(result?.id).toBe('mobilitaet');
  });

  it('is case-insensitive', () => {
    const result = matcheKrankheitsbild('ICH BRAUCHE EIN HÖRGERÄT');
    expect(result?.id).toBe('hoerhilfen');
  });

  it('returns null when nothing matches', () => {
    expect(matcheKrankheitsbild('Ich hätte gerne einen Kaffee')).toBeNull();
  });

  it('returns the first matching Krankheitsbild in taxonomy order for an ambiguous transcript', () => {
    const result = matcheKrankheitsbild('Wunde am Bein, kann schlecht gehen');
    expect(result?.id).toBe('mobilitaet');
  });
});

describe('findeKrankheitsbild', () => {
  it('finds a known id', () => {
    expect(findeKrankheitsbild('inkontinenz')?.bezeichnung).toBe('Inkontinenz');
  });

  it('returns undefined for an unknown id', () => {
    expect(findeKrankheitsbild('nicht-existent')).toBeUndefined();
  });
});
