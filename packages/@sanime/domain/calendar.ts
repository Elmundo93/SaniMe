// Business-day/time-window math shared between the mobile mock
// (lib/terminplanung.ts, still the deterministic client-side stand-in until
// Layer 5) and the backend's real SupplierCalendarService (Layer 3). Kept as
// a standalone, framework-free utility so neither side re-derives the same
// weekday-skipping loop or fixed daily windows independently.

export interface TimeWindow {
  startHour: number;
  endHour: number;
}

// Same 3 fixed daily slots the client mock uses (9–11 / 13–15 / 16–18).
export const DAILY_TIME_WINDOWS: TimeWindow[] = [
  { startHour: 9, endHour: 11 },
  { startHour: 13, endHour: 15 },
  { startHour: 16, endHour: 18 },
];

export function isBusinessDay(date: Date): boolean {
  const weekday = date.getDay();
  return weekday !== 0 && weekday !== 6;
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) added++;
  }
  return result;
}

export function applyTimeWindow(day: Date, window: TimeWindow): { start: Date; end: Date } {
  const start = new Date(day);
  start.setHours(window.startHour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(window.endHour, 0, 0, 0);
  return { start, end };
}
