import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { AccessLogInterceptor } from '../../../common/audit/access-log.interceptor';
import { AuditRead } from '../../../common/audit/audit-read.decorator';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { AnyPrincipalAuthGuard } from '../../auth/guards/any-principal-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { CurrentPrincipal, resolveOwnerFilter, type CurrentPrincipalInfo } from '../../auth/decorators/current-principal.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { SupplyOrderService } from '../supply-order.service';

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

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), title: z.string().min(1), description: z.string().min(1), actionType: z.string().min(1) }),
  z.object({ action: z.literal('resolve'), actionId: z.string().min(1) }),
]);

@Controller('orders')
export class OrdersController {
  constructor(private readonly supplyOrder: SupplyOrderService) {}

  @Get(':id')
  @UseGuards(AnyPrincipalAuthGuard)
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('order')
  getById(@Param('id') id: string, @CurrentPrincipal() principal: CurrentPrincipalInfo | null) {
    return this.supplyOrder.getOrder(DEFAULT_TENANT_CONTEXT, id, resolveOwnerFilter(principal));
  }

  @Patch(':id/status')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('orders:write')
  async setStatus(@Param('id') id: string, @Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, id, parsed.data, { type: 'admin', id: admin.id });
  }

  @Post(':id/actions')
  @UseGuards(AdminJwtAuthGuard)
  async actions(@Param('id') orderId: string, @Body() body: unknown) {
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    if (parsed.data.action === 'create') {
      const order = await this.supplyOrder.getOrder(DEFAULT_TENANT_CONTEXT, orderId);
      return this.supplyOrder.createOpenAction(order.supplyId, parsed.data.title, parsed.data.description, parsed.data.actionType);
    }
    await this.supplyOrder.resolveOpenAction(parsed.data.actionId);
    return { resolved: true };
  }
}
