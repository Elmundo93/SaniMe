import type { OcrAdresse, OnboardingSession, TerminSlot } from '@sanime/domain';
import type { ProposedSlot } from './api/onboarding';

// Liefertermin = Termin an der Lieferadresse: zuerst die vom Rezept
// (Personalienfeld), sonst die aus dem Profil. Ohne beides keine erfundene
// Anschrift, sondern ein ehrlicher Platzhalter.
export function lieferort(session: OnboardingSession, profilAdresse?: OcrAdresse | null): string {
  const adresse = session.positionen.find((p) => p.rezept?.patient.adresse)?.rezept?.patient.adresse ?? profilAdresse;
  if (!adresse?.strasse) return 'An deine Lieferadresse';
  return [adresse.strasse, [adresse.plz, adresse.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

// GET .../appointment-slots returns {supplierId, productId, start, end} — no id/address.
// Order is chronological (SupplierCalendarService's graceful-degradation search), so the
// first slot is genuinely the earliest — "Schnellster Termin" stays accurate.
export function terminAusVorschlag(slot: ProposedSlot, index: number, ort: string): TerminSlot {
  return {
    id: `${slot.supplierId}-${slot.start}`,
    beginn: slot.start,
    ende: slot.end,
    ort,
    hinweis: index === 0 ? 'Schnellster Termin' : undefined,
  };
}

export function terminAusKalenderdatum(session: OnboardingSession, datum: Date, ort: string): TerminSlot {
  const beginn = new Date(datum);
  beginn.setHours(13, 0, 0, 0);
  const ende = new Date(datum);
  ende.setHours(15, 0, 0, 0);
  return {
    id: `termin-${session.id}-kalender-${datum.toISOString().slice(0, 10)}`,
    beginn: beginn.toISOString(),
    ende: ende.toISOString(),
    ort,
  };
}
