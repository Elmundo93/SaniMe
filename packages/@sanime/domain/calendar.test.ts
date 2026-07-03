import { addBusinessDays, applyTimeWindow, DAILY_TIME_WINDOWS, isBusinessDay } from './calendar';

describe('isBusinessDay', () => {
  it('treats Saturday and Sunday as non-business days', () => {
    expect(isBusinessDay(new Date('2026-07-04'))).toBe(false); // Saturday
    expect(isBusinessDay(new Date('2026-07-05'))).toBe(false); // Sunday
  });

  it('treats Monday through Friday as business days', () => {
    expect(isBusinessDay(new Date('2026-07-06'))).toBe(true); // Monday
    expect(isBusinessDay(new Date('2026-07-10'))).toBe(true); // Friday
  });
});

describe('addBusinessDays', () => {
  it('skips weekends when counting forward', () => {
    // Friday 2026-07-03 + 1 business day -> Monday 2026-07-06
    const result = addBusinessDays(new Date('2026-07-03'), 1);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(6);
  });

  it('accumulates across multiple weekends', () => {
    // Friday 2026-07-03 + 6 business days -> Monday 2026-07-13
    const result = addBusinessDays(new Date('2026-07-03'), 6);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(13);
  });

  it('never lands on a weekend', () => {
    for (let days = 1; days <= 10; days++) {
      const result = addBusinessDays(new Date('2026-07-03'), days);
      expect(isBusinessDay(result)).toBe(true);
    }
  });
});

describe('applyTimeWindow', () => {
  it('sets start/end hours on the given day for each fixed window', () => {
    const day = new Date('2026-07-06');
    const { start, end } = applyTimeWindow(day, DAILY_TIME_WINDOWS[0]);
    expect(start.getHours()).toBe(9);
    expect(end.getHours()).toBe(11);
    expect(start.getDate()).toBe(day.getDate());
  });
});
