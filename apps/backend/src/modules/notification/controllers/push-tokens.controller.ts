import { BadRequestException, Body, Controller, Delete, ForbiddenException, HttpCode, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentCustomerSession } from '../../auth/decorators/current-customer-session.decorator';
import { CustomerSessionAuthGuard } from '../../auth/guards/customer-session-auth.guard';
import { PushTokensRepository } from '../push-tokens.repository';

const registrierenSchema = z.object({ token: z.string().min(16).max(512), platform: z.enum(['ios', 'android']) });
const entfernenSchema = z.object({ token: z.string().min(1).max(512) });

// Ein Push-Token gehört einem Kunden, nicht einer Session: Nachrichten zu
// Versorgungen gehen an die Person. Eine noch keinem Kunden zugeordnete
// Session hat keine Versorgungen, über die wir benachrichtigen könnten.
@Controller('push-tokens')
@UseGuards(CustomerSessionAuthGuard)
export class PushTokensController {
  constructor(private readonly tokens: PushTokensRepository) {}

  @Post()
  @HttpCode(204)
  async registrieren(@Body() body: unknown, @CurrentCustomerSession() session: { customerId: string | null }) {
    const parsed = registrierenSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Ungültiges Push-Token');
    if (!session.customerId) throw new ForbiddenException('Diese Sitzung ist noch keinem Kunden zugeordnet');
    await this.tokens.speichern(session.customerId, parsed.data.token, parsed.data.platform);
  }

  // Beim Abmelden: ab jetzt keine Nachrichten mehr auf dieses Gerät.
  @Delete()
  @HttpCode(204)
  async entfernen(@Body() body: unknown) {
    const parsed = entfernenSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Ungültiges Push-Token');
    await this.tokens.entfernen(parsed.data.token);
  }
}
