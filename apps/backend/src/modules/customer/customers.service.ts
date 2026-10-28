import { Inject, Injectable } from '@nestjs/common';
import type { TenantContext } from '../../common/repository/tenant-context';
import { CustomerAddressesRepository } from './customer-addresses.repository';
import { CustomersRepository } from './customers.repository';
import { ONBOARDING_SESSION_CLAIM_PORT, type OnboardingSessionClaimPort } from './ports/onboarding-session-claim.port';

export interface KundeAusBestellung {
  sessionId: string;
  // null = Session ist noch keinem Kunden zugeordnet (Neukunde oder nie per
  // Archivabgleich erkannt).
  customerId: string | null;
  vorname: string;
  nachname: string;
  telefon: string | null;
  email: string | null;
  versichertenNr: string;
  adresse: { strasse: string; plz: string; ort: string } | null;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly customers: CustomersRepository,
    private readonly addresses: CustomerAddressesRepository,
    @Inject(ONBOARDING_SESSION_CLAIM_PORT) private readonly claimPort: OnboardingSessionClaimPort,
  ) {}

  // Krankenkassenkarte archive-match — the only re-login path in the app
  // (mirrors lib/mockKundenArchiv.ts's sucheKundeImArchiv exactly).
  async matchByInsuredNumber(tenant: TenantContext, insuredNumber: string) {
    const customer = await this.customers.findByInsuredNumber(tenant, insuredNumber);
    if (!customer) {
      return null;
    }
    const addresses = await this.addresses.listForCustomer(customer.id);
    return { customer, addresses };
  }

  // Die Session gehört schon einem Kunden und die Bestellung ist für ihn selbst
  // (gleiche oder keine Versichertennummer). Nur dann entfällt die
  // Telefonbestätigung an der Kasse — eine neue Person braucht eine bestätigte
  // Nummer (Rückruf bei Notfall, Rückfragen zur Versorgung).
  async istBekannterBesteller(tenant: TenantContext, customerId: string | null, versichertenNr: string): Promise<boolean> {
    if (!customerId) return false;
    if (!normNr(versichertenNr)) return true;
    const kunde = await this.customers.findById(tenant, customerId);
    return !!kunde && (!normNr(kunde.insuredNumber) || normNr(kunde.insuredNumber) === normNr(versichertenNr));
  }

  findById(tenant: TenantContext, id: string) {
    return this.customers.findById(tenant, id);
  }

  // Beim Abschluss einer Bestellung: ohne Kunden blieb die Versorgung bisher
  // herrenlos (customerId null) — der Besteller sah sie nie unter
  // „Versorgungen“, weil GET /supplies eine unzugeordnete Session ablehnt.
  // Gleiche Vertrauensstufe wie der Archivabgleich: eine bekannte
  // Versichertennummer ordnet dem bestehenden Kunden zu, sonst entsteht ein
  // neuer. Die Rezeptadresse wird zur (Liefer-)Adresse des Kunden.
  async uebernehmeAusBestellung(tenant: TenantContext, daten: KundeAusBestellung): Promise<{ customerId: string; addressId: string | null }> {
    // Bestellt ein erkannter Kunde für eine andere versicherte Person (andere
    // Versichertennummer), gehört die Versorgung dieser Person — nicht dem
    // Besteller. Die Session wandert zu ihr, wie die Anzeige in der App.
    let customerId = (await this.istBekannterBesteller(tenant, daten.customerId, daten.versichertenNr)) ? daten.customerId : null;
    if (!customerId) {
      const bekannt = await this.customers.findByInsuredNumber(tenant, daten.versichertenNr);
      const kunde =
        bekannt ??
        (await this.customers.create(tenant, {
          firstName: daten.vorname,
          lastName: daten.nachname,
          phone: daten.telefon,
          email: daten.email,
          insuredNumber: daten.versichertenNr,
        }));
      customerId = kunde.id;
      await this.claimPort.claimSession(daten.sessionId, customerId);
    }

    if (!daten.adresse?.strasse || !daten.adresse.plz) return { customerId, addressId: null };
    const vorhanden = await this.addresses.listForCustomer(customerId);
    const gleich = vorhanden.find(
      (a) => normAdresse(a.strasse) === normAdresse(daten.adresse!.strasse) && a.plz === daten.adresse!.plz,
    );
    if (gleich) return { customerId, addressId: gleich.id };
    const neu = await this.addresses.create({ customerId, ...daten.adresse, isDefault: vorhanden.length === 0 });
    return { customerId, addressId: neu.id };
  }
}

function normNr(nr: string | null | undefined): string {
  return (nr ?? '').replace(/\s+/g, '').toUpperCase();
}

function normAdresse(strasse: string): string {
  return strasse.toLowerCase().replace(/str(asse|aße)?\.?/g, 'str').replace(/\s+/g, '');
}
