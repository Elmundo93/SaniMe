import { ERREICHBARKEITEN, NOTFALL_GRUENDE, type Erreichbarkeit, type NotfallGrund } from '@sanime/domain';
import type { OrderStatus, OffeneAktion, TimelineEvent, Versorgung } from '../types';
import type { OpenActionRow, SupplyRow, TimelineEventRow } from './api/supply';

// apps/backend's SupplyStatus (14 lowercase values, @sanime/domain/supply.ts) is a
// structurally different enum from the app's OrderStatus (9 uppercase values) — this
// is the one place that translation happens. No backend status maps to CANCELLED
// today (SupplyEvent has no cancellation event yet), so it's simply unreachable
// from real data for now, not a mapping gap.
const STATUS_MAP: Record<string, OrderStatus> = {
  draft: 'PENDING_PRESCRIPTION',
  documents_uploaded: 'PENDING_REVIEW',
  ocr_verified: 'PENDING_REVIEW',
  customer_confirmation_required: 'PENDING_REVIEW',
  // Eingegangen, Antrag noch nicht verschickt — erst AntragVersendet heißt
  // „bei der Krankenkasse“.
  submitted: 'PENDING_REVIEW',
  insurance_review: 'PENDING_INSURANCE',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  supplier_assigned: 'PROCESSING',
  ordered: 'PROCESSING',
  appointment_scheduled: 'SHIPPED',
  delivered: 'DELIVERED',
  completed: 'DELIVERED',
  archived: 'DELIVERED',
};

function toOrderStatus(raw: string): OrderStatus {
  return STATUS_MAP[raw] ?? 'PENDING_REVIEW';
}

// Neither StatusTimeline nor the detail screen's step-coloring reads a per-entry
// status field (both derive coloring from the overall supply status, see
// components/dashboard/StatusTimeline.tsx / app/(app)/dashboard/[id].tsx) — so
// filling every TimelineEvent.status with the mapped overall status is a
// harmless placeholder, not a real field.
function toTimelineEvent(row: TimelineEventRow, overallStatus: OrderStatus): TimelineEvent {
  return {
    id: row.id,
    status: overallStatus,
    label: row.label,
    beschreibung: row.description,
    zeitpunkt: row.occurredAt ?? '',
    abgeschlossen: row.completed,
  };
}

function toOffeneAktion(row: OpenActionRow): OffeneAktion {
  return {
    id: row.id,
    titel: row.title,
    beschreibung: row.description,
    typ: row.actionType as OffeneAktion['typ'],
  };
}

export function mapSupplyRowToVersorgung(row: SupplyRow): Versorgung {
  const status = toOrderStatus(row.status);
  return {
    id: row.id,
    status,
    produkt: row.variantLabelSnapshot ? `${row.productNameSnapshot} · ${row.variantLabelSnapshot}` : row.productNameSnapshot,
    produktId: row.productId,
    hilfsmittelNr: row.hilfsmittelNrSnapshot ?? '',
    selbstzahler: !row.hilfsmittelNrSnapshot,
    antragVersendetAm: row.insuranceSubmittedAt ?? undefined,
    entschiedenAm: row.insuranceDecidedAt ?? undefined,
    termin: row.appointment ? { beginn: row.appointment.start, ende: row.appointment.end } : undefined,
    notfall: toNotfall(row.urgentRequest),
    arzt: row.doctorNameSnapshot,
    krankenkasse: row.insurerNameSnapshot,
    erstellt: row.createdAt,
    aktualisiert: row.updatedAt,
    hersteller: row.manufacturerNameSnapshot,
    ansprechpartner: 'Dein SaniMe-Team',
    lieferzeit: row.deliveryTimeLabelSnapshot,
    // A resolved action is no longer "offen" — filtered here rather than
    // trusted from the server, since GET /supplies/:id's openActions is the
    // full unfiltered history (unlike GET /supplies' already-filtered rows,
    // where this filter is simply a no-op).
    offeneAktionen: row.openActions.filter((a) => !a.resolvedAt).map(toOffeneAktion),
    timeline: row.timeline.map((t) => toTimelineEvent(t, status)),
  };
}

function toNotfall(row: SupplyRow['urgentRequest']): Versorgung['notfall'] {
  if (!row || !(row.reason in NOTFALL_GRUENDE) || !(row.availability in ERREICHBARKEITEN)) return undefined;
  return { grund: row.reason as NotfallGrund, erreichbarkeit: row.availability as Erreichbarkeit, angefragtAm: row.createdAt };
}
