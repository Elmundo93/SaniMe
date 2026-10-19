import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { OnboardingService } from '../onboarding.service';

const widerrufSchema = z.object({ einwilligungsToken: z.string().min(1) });

// Widerruf der dauerhaften Einwilligung (Einstellungen in der App). Ohne
// Bearer-Guard: der Token selbst ist der Besitznachweis, und ein Gast hat
// keine andere Identität. Antwortet immer 204 — auch für unbekannte Tokens,
// damit der Endpoint nichts über fremde Tokens verrät.
@Controller('consent-grants')
export class ConsentGrantsController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('revoke')
  @HttpCode(204)
  async revoke(@Body() body: unknown) {
    const parsed = widerrufSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('einwilligungsToken ist erforderlich');
    }
    await this.onboarding.einwilligungWiderrufen(DEFAULT_TENANT_CONTEXT, parsed.data.einwilligungsToken);
  }
}
