import type { ConfidenceLevel, OcrConfidence, OcrResult, Produkt } from '@sanime/domain';
import type { InsurancePolicy, OcrResultRow } from '../../db/schema';

interface CatalogProductJoined {
  id: string;
  name: string;
  description: string;
  hilfsmittelnummer: string;
  features: unknown;
  categoryName: string;
  manufacturerName: string;
  // Only present when fetched via CatalogService.getProduct (a single
  // product); CatalogService.listProducts's lighter listing query doesn't
  // join supplier offers, so this is absent there — eigenanteil/lieferzeit
  // fall back to placeholders in that case, corrected once a specific
  // product is fetched individually (SUPPLY_AUSGEWAEHLT, complete()).
  offers?: { deliveryTimeDays: number; customerCopayCents: number }[];
}

// Maps the Catalog module's joined product shape (see products.repository.ts)
// to @sanime/domain's Produkt — the shape the client-side workflow engine
// already expects (event payloads carry a full Produkt, not just an id).
export function toProdukt(product: CatalogProductJoined): Produkt {
  const primaryOffer = product.offers?.[0];
  return {
    id: product.id,
    name: product.name,
    hersteller: product.manufacturerName,
    hilfsmittelNr: product.hilfsmittelnummer,
    beschreibung: product.description,
    eigenanteil: primaryOffer ? primaryOffer.customerCopayCents / 100 : 0,
    lieferzeit: primaryOffer ? `${primaryOffer.deliveryTimeDays} Werktage` : 'unbekannt',
    kategorie: product.categoryName,
    merkmale: Array.isArray(product.features) ? (product.features as string[]) : [],
  } as Produkt;
}

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
