import { BadRequestException, Body, Controller, Inject, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentCustomerSession } from '../../auth/decorators/current-customer-session.decorator';
import { CustomerSessionAuthGuard } from '../../auth/guards/customer-session-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { SupplyOrderService } from '../../supply-order/supply-order.service';
import { CustomersService } from '../customers.service';
import { ONBOARDING_SESSION_CLAIM_PORT, type OnboardingSessionClaimPort } from '../ports/onboarding-session-claim.port';

const matchSchema = z.object({ insuredNumber: z.string().min(1) });

// The Krankenkassenkarte archive-match — the only re-login path in the app
// (mirrors lib/mockKundenArchiv.ts's pruefeArchivTreffer/sucheKundeImArchiv).
// On a hit, claims the CURRENT onboarding session to the matched customer;
// the client keeps using the same Bearer session-secret afterward — no new
// token needs to be minted, unlike today's client which fabricates a fake
// one (`archiv-token-${id}`).
@Controller('customers')
export class CustomersMatchController {
  constructor(
    private readonly customers: CustomersService,
    private readonly supplyOrder: SupplyOrderService,
    @Inject(ONBOARDING_SESSION_CLAIM_PORT) private readonly claimPort: OnboardingSessionClaimPort,
  ) {}

  @Post('match')
  @UseGuards(CustomerSessionAuthGuard)
  async match(@Body() body: unknown, @CurrentCustomerSession() session: { sessionId: string; customerId: string | null }) {
    const parsed = matchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const match = await this.customers.matchByInsuredNumber(DEFAULT_TENANT_CONTEXT, parsed.data.insuredNumber);
    if (!match) {
      throw new NotFoundException('Kein Kunde mit dieser Versichertennummer im Archiv gefunden');
    }

    await this.claimPort.claimSession(session.sessionId, match.customer.id);
    const supplies = await this.supplyOrder.listSuppliesForCustomer(DEFAULT_TENANT_CONTEXT, match.customer.id);

    return { customer: match.customer, addresses: match.addresses, supplies };
  }
}
