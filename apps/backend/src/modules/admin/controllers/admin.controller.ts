import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { NOTFALL_ERGEBNISSE, SUPPLY_STATUSES, type NotfallErgebnis } from '@sanime/domain';
import { z } from 'zod';
import { AccessLogInterceptor } from '../../../common/audit/access-log.interceptor';
import { AuditRead } from '../../../common/audit/audit-read.decorator';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
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
  'AntragVersendet',
  'OhneGenehmigungFreigegeben',
  'InsuranceApproved',
  'InsuranceRejected',
  'SupplierAssigned',
  'Ordered',
  'AppointmentScheduled',
  'Delivered',
  'Completed',
  'Archived',
] as const;

// erwarteterStatus: optionaler Konfliktschutz der Admin-App (409, wenn jemand
// anderes die Versorgung inzwischen weitergeschaltet hat).
const eventSchema = z.object({ type: z.enum(SUPPLY_EVENT_TYPES), erwarteterStatus: z.enum(SUPPLY_STATUSES).optional() });
const listSchema = z.object({
  q: z.string().max(100).optional(),
  status: z
    .string()
    .optional()
    .transform((wert) => (wert ? wert.split(',').filter(Boolean) : undefined))
    .pipe(z.array(z.enum(SUPPLY_STATUSES)).optional()),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
const rueckrufSchema = z.object({
  ergebnis: z.enum(Object.keys(NOTFALL_ERGEBNISSE) as [NotfallErgebnis, ...NotfallErgebnis[]]),
});

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
  }
  return parsed.data;
}
const noteSchema = z.object({ body: z.string().min(1) });
const timelineSchema = z.object({ label: z.string().min(1), description: z.string().min(1) });

@Controller('admin')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('inbox')
  @Roles('orders:read')
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('open_action')
  inbox() {
    return this.admin.listInbox(DEFAULT_TENANT_CONTEXT);
  }

  @Get('orders')
  @Roles('orders:read')
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('order')
  listOrders(@Query() query: unknown) {
    const filter = parse(listSchema, query);
    return this.admin.listOrders(DEFAULT_TENANT_CONTEXT, filter);
  }

  // Aktive Teammitglieder (Name/E-Mail) — für „Bearbeiter:in“ in Listen.
  @Get('team')
  @Roles('orders:read')
  team() {
    return this.admin.listTeam(DEFAULT_TENANT_CONTEXT);
  }

  @Get('orders/:id')
  @Roles('orders:read')
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('order')
  getOrder(@Param('id') id: string) {
    return this.admin.getOrderDetail(DEFAULT_TENANT_CONTEXT, id);
  }

  @Post('orders/:id/notes')
  @Roles('orders:write')
  async addNote(@Param('id') orderId: string, @Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.admin.addNote(DEFAULT_TENANT_CONTEXT, orderId, admin.id, parsed.data.body);
  }

  @Post('orders/:id/timeline')
  @Roles('orders:write')
  async addTimelineEntry(@Param('id') orderId: string, @Body() body: unknown) {
    const parsed = timelineSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }
    return this.admin.addTimelineEntry(DEFAULT_TENANT_CONTEXT, orderId, parsed.data.label, parsed.data.description);
  }

  @Patch('orders/:id/status')
  @Roles('orders:write')
  async setStatus(@Param('id') orderId: string, @Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const { type, erwarteterStatus } = parse(eventSchema, body);
    return this.admin.transitionStatus(DEFAULT_TENANT_CONTEXT, orderId, { type }, { type: 'admin', id: admin.id }, erwarteterStatus);
  }

  @Post('actions/:id/uebernehmen')
  @Roles('orders:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async uebernehmen(@Param('id') actionId: string, @CurrentAdmin() admin: { id: string }) {
    await this.admin.aufgabeZuweisen(DEFAULT_TENANT_CONTEXT, actionId, admin.id);
  }

  @Post('actions/:id/freigeben')
  @Roles('orders:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async freigeben(@Param('id') actionId: string) {
    await this.admin.aufgabeZuweisen(DEFAULT_TENANT_CONTEXT, actionId, null);
  }

  @Post('actions/:id/erledigen')
  @Roles('orders:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async erledigen(@Param('id') actionId: string, @CurrentAdmin() admin: { id: string }) {
    await this.admin.aufgabeErledigen(DEFAULT_TENANT_CONTEXT, actionId, { type: 'admin', id: admin.id });
  }

  @Post('urgent-deliveries/:id/rueckruf')
  @Roles('orders:write')
  @HttpCode(HttpStatus.OK)
  rueckruf(@Param('id') requestId: string, @Body() body: unknown, @CurrentAdmin() admin: { id: string }) {
    const { ergebnis } = parse(rueckrufSchema, body);
    return this.admin.notfallRueckruf(DEFAULT_TENANT_CONTEXT, requestId, ergebnis, { type: 'admin', id: admin.id });
  }
}
