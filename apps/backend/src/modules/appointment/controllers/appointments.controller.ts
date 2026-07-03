import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { AppointmentsService } from '../appointments.service';

// Both admin-guarded — today's only real caller is an admin coordinating
// "Termin koordinieren" post-submission, not a customer mid-onboarding (the
// onboarding-side slot picker stays the client mock until Layer 5).
const slotsQuerySchema = z.object({
  supplierId: z.string().uuid(),
  productId: z.string().uuid(),
  count: z.coerce.number().int().min(1).max(10).optional(),
});

const bookSchema = z.object({
  orderId: z.string().uuid(),
  supplierId: z.string().uuid(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  addressId: z.string().uuid().nullable().optional(),
});

@Controller('appointments')
@UseGuards(AdminJwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get('slots')
  slots(@Query() query: unknown) {
    const parsed = slotsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.appointments.proposeSlots(DEFAULT_TENANT_CONTEXT, parsed.data.supplierId, parsed.data.productId, parsed.data.count);
  }

  @Post()
  book(@Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.appointments.book(
      DEFAULT_TENANT_CONTEXT,
      { ...parsed.data, addressId: parsed.data.addressId ?? null },
      { type: 'admin', id: admin.id },
    );
  }
}
