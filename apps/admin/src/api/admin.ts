import type { NotfallErgebnis, SupplyEvent, SupplyStatus } from '@sanime/domain';
import { anfrage } from './client';

// Antworttypen der Admin-API (apps/backend/src/modules/admin). Datumswerte
// kommen als ISO-Strings.

export interface AdminProfil {
  id: string;
  email: string;
  name: string;
  permissions: string[];
}

export type LoginErgebnis =
  | { schritt: 'code'; challengeToken: string }
  | { schritt: 'einrichten'; challengeToken: string; geheimnis: string; otpauthUrl: string };

export type Dringlichkeit = 'notfall' | 'frist' | 'neu' | 'normal';

export interface Aufgabe {
  id: string;
  supplyId: string;
  orderId: string;
  title: string;
  description: string;
  actionType: string;
  createdAt: string;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  assignedAdminEmail: string | null;
  supplyStatus: SupplyStatus;
  kundeName: string | null;
  produktName: string;
  kasse: string;
  insuranceSubmittedAt: string | null;
  dringlichkeit: Dringlichkeit;
  fristBis: string | null;
}

export interface VersorgungsZeile {
  orderId: string;
  supplyId: string;
  status: SupplyStatus;
  createdAt: string;
  updatedAt: string;
  kundeName: string | null;
  produktName: string;
  kasse: string;
  selbstzahler: boolean;
  insuranceSubmittedAt: string | null;
}

export interface VersorgungsListe {
  eintraege: VersorgungsZeile[];
  gesamt: number;
}

export interface VerlaufEintrag {
  id: string;
  label: string;
  description: string;
  occurredAt: string | null;
  createdAt: string;
  source: 'system' | 'admin';
}

export interface Notiz {
  id: string;
  body: string;
  createdAt: string;
  authorAdminId: string;
  autor: string;
}

export interface DetailAufgabe {
  id: string;
  title: string;
  description: string;
  actionType: string;
  audience: 'intern' | 'kunde';
  createdAt: string;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
}

export interface VersorgungsDetail {
  order: { id: string; status: SupplyStatus; createdAt: string };
  supply: {
    id: string;
    status: SupplyStatus;
    productNameSnapshot: string;
    variantLabelSnapshot: string | null;
    manufacturerNameSnapshot: string;
    hilfsmittelNrSnapshot: string | null;
    doctorNameSnapshot: string;
    insurerNameSnapshot: string;
    customerCopaySnapshotCents: number;
    deliveryTimeLabelSnapshot: string;
    insuranceSubmittedAt: string | null;
    insuranceDecidedAt: string | null;
    createdAt: string;
    timeline: VerlaufEintrag[];
  };
  notes: Notiz[];
  appointment: { scheduledStart: string; scheduledEnd: string } | null;
  kunde: {
    id: string;
    vorname: string;
    nachname: string;
    telefon: string | null;
    email: string | null;
    versichertennummer: string;
    geburtsdatum: string | null;
  } | null;
  lieferadresse: { strasse: string; plz: string; ort: string } | null;
  rezept: {
    patientName: string;
    patientGeburtsdatum: string;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
    arzt: string;
    lanr: string | null;
    diagnose: string;
    hilfsmittel: string;
    hilfsmittelNr: string | null;
    ausstellungsdatum: string | null;
    vomKundenKorrigiert: boolean;
  } | null;
  lieferant: { name: string; lieferzeitTage: number } | null;
  aufgaben: DetailAufgabe[];
  notfall: { id: string; grund: string; erreichbarkeit: string; telefon: string | null; createdAt: string } | null;
  fristBis: string | null;
}

export interface Teammitglied {
  id: string;
  email: string;
  name: string;
}

export const api = {
  login: (email: string, password: string) =>
    anfrage<LoginErgebnis>('/admin/auth/login', { methode: 'POST', body: { email, password }, ohneAbmeldung: true }),
  code: (challengeToken: string, code: string) =>
    anfrage<AdminProfil>('/admin/auth/code', { methode: 'POST', body: { challengeToken, code }, ohneAbmeldung: true }),
  ich: () => anfrage<AdminProfil>('/admin/auth/me', { ohneAbmeldung: true }),
  abmelden: () => anfrage<void>('/admin/auth/logout', { methode: 'POST', ohneAbmeldung: true }),

  arbeitskorb: () => anfrage<Aufgabe[]>('/admin/inbox'),
  versorgungen: (filter: { q?: string; status?: string[]; limit: number; offset: number }) => {
    const params = new URLSearchParams({ limit: String(filter.limit), offset: String(filter.offset) });
    if (filter.q) params.set('q', filter.q);
    if (filter.status?.length) params.set('status', filter.status.join(','));
    return anfrage<VersorgungsListe>(`/admin/orders?${params.toString()}`);
  },
  versorgung: (orderId: string) => anfrage<VersorgungsDetail>(`/admin/orders/${encodeURIComponent(orderId)}`),
  team: () => anfrage<Teammitglied[]>('/admin/team'),

  statusSetzen: (orderId: string, type: SupplyEvent['type'], erwarteterStatus: SupplyStatus) =>
    anfrage<{ status: SupplyStatus }>(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
      methode: 'PATCH',
      body: { type, erwarteterStatus },
    }),
  notizHinzufuegen: (orderId: string, body: string) =>
    anfrage<Notiz>(`/admin/orders/${encodeURIComponent(orderId)}/notes`, { methode: 'POST', body: { body } }),
  kundenNachricht: (orderId: string, label: string, description: string) =>
    anfrage<VerlaufEintrag>(`/admin/orders/${encodeURIComponent(orderId)}/timeline`, { methode: 'POST', body: { label, description } }),
  uebernehmen: (aufgabeId: string) => anfrage<void>(`/admin/actions/${encodeURIComponent(aufgabeId)}/uebernehmen`, { methode: 'POST' }),
  freigeben: (aufgabeId: string) => anfrage<void>(`/admin/actions/${encodeURIComponent(aufgabeId)}/freigeben`, { methode: 'POST' }),
  erledigen: (aufgabeId: string) => anfrage<void>(`/admin/actions/${encodeURIComponent(aufgabeId)}/erledigen`, { methode: 'POST' }),
  rueckruf: (notfallId: string, ergebnis: NotfallErgebnis) =>
    anfrage<{ abgeschlossen: boolean; label: string }>(`/admin/urgent-deliveries/${encodeURIComponent(notfallId)}/rueckruf`, {
      methode: 'POST',
      body: { ergebnis },
    }),
};
