import type { OnboardingSession, TerminSlot } from '@sanime/domain';
import type { ProposedSlot } from './api/onboarding';

const MOCK_ADRESSE = 'Musterstraße 12, 12345 Berlin';

// GET .../appointment-slots returns {supplierId, productId, start, end} — no id/address,
// since those aren't real domain concepts yet (no delivery-address wiring in this pass,
// same MOCK_ADRESSE placeholder used everywhere else pre-Phase-7b). Order is chronological
// (SupplierCalendarService's graceful-degradation search), so the first slot is genuinely
// the earliest — "Schnellster Termin" stays accurate, not just copied from the old mock.
export function terminAusVorschlag(slot: ProposedSlot, index: number): TerminSlot {
  return {
    id: `${slot.supplierId}-${slot.start}`,
    beginn: slot.start,
    ende: slot.end,
    ort: MOCK_ADRESSE,
    hinweis: index === 0 ? 'Schnellster Termin' : undefined,
  };
}

export function terminAusKalenderdatum(session: OnboardingSession, datum: Date): TerminSlot {
  const beginn = new Date(datum);
  beginn.setHours(13, 0, 0, 0);
  const ende = new Date(datum);
  ende.setHours(15, 0, 0, 0);
  return {
    id: `termin-${session.id}-kalender-${datum.toISOString().slice(0, 10)}`,
    beginn: beginn.toISOString(),
    ende: ende.toISOString(),
    ort: MOCK_ADRESSE,
  };
}
