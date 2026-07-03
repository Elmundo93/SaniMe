import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../common/repository/tenant-context';
import { CustomerAddressesRepository } from './customer-addresses.repository';
import { CustomersRepository } from './customers.repository';

@Injectable()
export class CustomersService {
  constructor(
    private readonly customers: CustomersRepository,
    private readonly addresses: CustomerAddressesRepository,
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

  findById(tenant: TenantContext, id: string) {
    return this.customers.findById(tenant, id);
  }
}
