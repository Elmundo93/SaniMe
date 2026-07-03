import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { AdminService } from '../admin.service';

// Same event union as OrdersController's PATCH /orders/:id/status — kept as
// a local const rather than a shared export so this genuinely-additive route
// never risks a signature drift on the existing, test-covered one.
const SUPPLY_EVENT_TYPES = [
  'SupplyCreated',
  'DocumentsUploaded',
  'OcrVerified',
  'CustomerConfirmationReceived',
  'Submitted',
  'InsuranceApproved',
  'InsuranceRejected',
  'SupplierAssigned',
  'Ordered',
  'AppointmentScheduled',
  'Delivered',
  'Completed',
  'Archived',
] as const;

const eventSchema = z.object({ type: z.enum(SUPPLY_EVENT_TYPES) });
const noteSchema = z.object({ body: z.string().min(1) });
const timelineSchema = z.object({ label: z.string().min(1), description: z.string().min(1) });

@Controller('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('inbox')
  inbox() {
    return this.admin.listInbox(DEFAULT_TENANT_CONTEXT);
  }

  @Get('orders')
  listOrders() {
    return this.admin.listOrders(DEFAULT_TENANT_CONTEXT);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.admin.getOrderDetail(DEFAULT_TENANT_CONTEXT, id);
  }

  @Post('orders/:id/notes')
  async addNote(@Param('id') orderId: string, @Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.admin.addNote(DEFAULT_TENANT_CONTEXT, orderId, admin.id, parsed.data.body);
  }

  @Post('orders/:id/timeline')
  async addTimelineEntry(@Param('id') orderId: string, @Body() body: unknown) {
    const parsed = timelineSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.admin.addTimelineEntry(DEFAULT_TENANT_CONTEXT, orderId, parsed.data.label, parsed.data.description);
  }

  @Patch('orders/:id/status')
  async setStatus(@Param('id') orderId: string, @Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.admin.transitionStatus(DEFAULT_TENANT_CONTEXT, orderId, parsed.data, { type: 'admin', id: admin.id });
  }
}
