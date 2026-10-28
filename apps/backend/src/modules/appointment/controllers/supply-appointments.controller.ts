import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentPrincipal, resolveOwnerFilter, type CurrentPrincipalInfo } from '../../auth/decorators/current-principal.decorator';
import { AnyPrincipalAuthGuard } from '../../auth/guards/any-principal-auth.guard';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { AppointmentsService } from '../appointments.service';

const waehlenSchema = z.object({ start: z.string().datetime() });

// Liefertermin nach der Genehmigung — der Kunde wählt selbst aus echten,
// kapazitätsgeprüften Vorschlägen (statt „Termin koordinieren“ per Telefon).
@Controller('supplies/:id')
@UseGuards(AnyPrincipalAuthGuard)
export class SupplyAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get('appointment-slots')
  slots(@Param('id') id: string, @CurrentPrincipal() principal: CurrentPrincipalInfo | null) {
    return this.appointments.slotsFuerVersorgung(DEFAULT_TENANT_CONTEXT, id, resolveOwnerFilter(principal));
  }

  @Post('appointment')
  async waehlen(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: CurrentPrincipalInfo | null) {
    const parsed = waehlenSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Bitte wähle einen Termin aus.');
    const termin = await this.appointments.terminWaehlen(DEFAULT_TENANT_CONTEXT, id, resolveOwnerFilter(principal), parsed.data.start);
    return { start: termin.scheduledStart, end: termin.scheduledEnd };
  }
}
