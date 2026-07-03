import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { DELETION_REASON_CODES } from '../../../db/schema/deletion-request.schema';
import { CurrentCustomerSession } from '../../auth/decorators/current-customer-session.decorator';
import { CustomerSessionAuthGuard } from '../../auth/guards/customer-session-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { DeletionRequestsService } from '../deletion-requests.service';

const requestSchema = z.object({ reasonCode: z.enum(DELETION_REASON_CODES).nullable().optional() });

@Controller('me/deletion-requests')
@UseGuards(CustomerSessionAuthGuard)
export class MeDeletionRequestsController {
  constructor(private readonly deletionRequests: DeletionRequestsService) {}

  @Post()
  request(@Body() body: unknown, @CurrentCustomerSession() session: { customerId: string | null }) {
    if (!session.customerId) {
      throw new BadRequestException('Diese Sitzung ist noch keinem Kunden zugeordnet');
    }
    const parsed = requestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.deletionRequests.requestDeletion(
      DEFAULT_TENANT_CONTEXT,
      session.customerId,
      { type: 'customer', id: session.customerId },
      parsed.data.reasonCode ?? null,
    );
  }
}
