import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { customerAddresses } from '../../db/schema';

@Injectable()
export class CustomerAddressesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  listForCustomer(customerId: string) {
    return this.db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId));
  }

  async create(input: { customerId: string; label?: string; strasse: string; plz: string; ort: string; isDefault?: boolean }) {
    const [row] = await this.db.insert(customerAddresses).values(input).returning();
    return row;
  }
}
