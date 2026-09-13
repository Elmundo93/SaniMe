import type { ConfidenceLevel, OcrConfidence, OcrResult } from '@sanime/domain';
import type { InsurancePolicy, OcrResultRow } from '../../db/schema';

// Moved to the Catalog module — CatalogController's own GET /products,
// /products/:id endpoints need this mapping directly, and Onboarding already
// depends on Catalog, not the reverse. Re-exported here since every existing
// call site in this file's module imports it from here.
export { toProdukt } from '../catalog/catalog.mapper';

// ocr_results and insurance_policies are separate tables (Principle 11) —
// the domain OcrResult's `krankenkasse` sub-object is assembled from both.
export function toOcrResult(row: OcrResultRow, policy: InsurancePolicy | null): OcrResult {
  return {
    patient: { name: row.patientName, dateOfBirth: row.patientDob },
    arzt: { name: row.doctorName, lanr: row.doctorLanr ?? undefined },
    krankenkasse: {
      name: policy?.insurerName ?? '',
      ik: policy?.insurerIk ?? undefined,
      versichertenNr: policy?.insuredNumber ?? '',
    },
    diagnose: row.diagnose,
    hilfsmittel: row.hilfsmittel,
    hilfsmittelNr: row.hilfsmittelNr ?? undefined,
    datum: row.datum ?? '',
  };
}

export function toOcrConfidence(raw: unknown, krankenkasseOverride?: ConfidenceLevel): OcrConfidence {
  const base = (raw ?? {}) as Partial<OcrConfidence>;
  return {
    patient: base.patient ?? 'low',
    arzt: base.arzt ?? 'low',
    krankenkasse: krankenkasseOverride ?? base.krankenkasse ?? 'low',
    diagnose: base.diagnose ?? 'low',
    hilfsmittel: base.hilfsmittel ?? 'low',
  };
}
