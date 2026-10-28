import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { OnboardingEvent } from '@sanime/domain';
import { AuditRead } from '../../../common/audit/audit-read.decorator';
import { AccessLogInterceptor } from '../../../common/audit/access-log.interceptor';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { CurrentCustomerSession } from '../../auth/decorators/current-customer-session.decorator';
import { CustomerSessionAuthGuard } from '../../auth/guards/customer-session-auth.guard';
import { patchBodySchema } from '../dto/onboarding-event.schema';
import { OnboardingService } from '../onboarding.service';

@Controller('onboarding-sessions')
export class OnboardingController {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  createSession() {
    return this.onboarding.createSession(DEFAULT_TENANT_CONTEXT);
  }

  @Get('current')
  @UseGuards(CustomerSessionAuthGuard)
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('ocr_result')
  getCurrent(@CurrentCustomerSession() session: { sessionId: string }) {
    return this.onboarding.getCurrent(DEFAULT_TENANT_CONTEXT, session.sessionId);
  }

  @Patch(':id')
  @UseGuards(CustomerSessionAuthGuard)
  @UseInterceptors(AccessLogInterceptor)
  @AuditRead('ocr_result')
  async patch(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentCustomerSession() session: { sessionId: string },
    @Req() req: Request,
  ) {
    requireIdempotencyKey(req);
    if (session.sessionId !== id) {
      throw new BadRequestException('Session-ID stimmt nicht mit dem authentifizierten Bearer-Token überein');
    }
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const event = withDefaultedProdukte(parsed.data.event);
    return this.onboarding.patch(DEFAULT_TENANT_CONTEXT, id, event, {
      ipAddress: req.ip ?? null,
      otpCode: parsed.data.code,
    });
  }

  // Reicht eine Versorgung ohne Checkout-Zahlung ein (Rezept-Versorgungen).
  // Zahlungspflichtige Selbstzahler-Käufe lehnt der FSM-Guard hier ab — die
  // schließt ausschließlich StripeWebhookController ab.
  @Post(':id/complete')
  @UseGuards(CustomerSessionAuthGuard)
  complete(@Param('id') id: string, @CurrentCustomerSession() session: { sessionId: string }, @Req() req: Request) {
    requireIdempotencyKey(req);
    if (session.sessionId !== id) {
      throw new BadRequestException('Session-ID stimmt nicht mit dem authentifizierten Bearer-Token überein');
    }
    return this.onboarding.einreichen(DEFAULT_TENANT_CONTEXT, id);
  }

  // Stille Prüfung über das Mobilfunknetz gescheitert (z. B. WLAN) → die
  // App fordert sofort die SMS an, statt den Kanal-Timeout abzuwarten.
  @Post(':id/sms-statt-netzpruefung')
  @UseGuards(CustomerSessionAuthGuard)
  @HttpCode(204)
  async smsStattNetzpruefung(@Param('id') id: string, @CurrentCustomerSession() session: { sessionId: string }) {
    if (session.sessionId !== id) {
      throw new BadRequestException('Session-ID stimmt nicht mit dem authentifizierten Bearer-Token überein');
    }
    await this.onboarding.smsStattNetzpruefung(DEFAULT_TENANT_CONTEXT, id);
  }

  @Get(':id/appointment-slots')
  @UseGuards(CustomerSessionAuthGuard)
  getAppointmentSlots(@Param('id') id: string, @CurrentCustomerSession() session: { sessionId: string }) {
    if (session.sessionId !== id) {
      throw new BadRequestException('Session-ID stimmt nicht mit dem authentifizierten Bearer-Token überein');
    }
    return this.onboarding.proposeAppointmentSlots(DEFAULT_TENANT_CONTEXT, id);
  }

  @Post(':id/payment-intent')
  @UseGuards(CustomerSessionAuthGuard)
  createPaymentIntent(@Param('id') id: string, @CurrentCustomerSession() session: { sessionId: string }, @Req() req: Request) {
    requireIdempotencyKey(req);
    if (session.sessionId !== id) {
      throw new BadRequestException('Session-ID stimmt nicht mit dem authentifizierten Bearer-Token überein');
    }
    return this.onboarding.createPaymentIntent(DEFAULT_TENANT_CONTEXT, id);
  }

  // Nur lokale Entwicklung ohne Stripe-Keys: simuliert einen erfolgreichen
  // payment_intent.succeeded-Webhook. Läuft über dieselbe
  // abschliessenNachZahlung() wie StripeWebhookController (inkl. FSM-Guard
  // "Zahlung fällig"), erzeugt aber keine payments-Zeile. Außerhalb von
  // NODE_ENV=development existiert die Route nicht (404) — strikt auf
  // 'development' statt "nicht production", damit ein falsch/nicht gesetztes
  // NODE_ENV auf einem Server sie nicht versehentlich freischaltet.
  @Post(':id/dev-zahlung')
  @UseGuards(CustomerSessionAuthGuard)
  async devZahlungSimulieren(@Param('id') id: string, @CurrentCustomerSession() session: { sessionId: string }) {
    if (this.config.get<string>('NODE_ENV') !== 'development') {
      throw new NotFoundException();
    }
    if (session.sessionId !== id) {
      throw new BadRequestException('Session-ID stimmt nicht mit dem authentifizierten Bearer-Token überein');
    }
    return this.onboarding.abschliessenNachZahlung(DEFAULT_TENANT_CONTEXT, id);
  }
}

// Principle 9 names PATCH .../:id and POST .../complete explicitly as
// requiring an Idempotency-Key — the global IdempotencyMiddleware (Layer 1)
// is opt-in (works when the header is present, no-ops otherwise), so these
// two routes additionally enforce that it was actually sent.
function requireIdempotencyKey(req: Request): void {
  if (!req.header('idempotency-key')) {
    throw new BadRequestException('Idempotency-Key-Header ist für diese Aktion erforderlich');
  }
}

// The zod schema makes `produkte` optional (the client's value is always
// discarded server-side anyway — see OnboardingService.patch), but
// @sanime/domain's OnboardingEvent requires it non-optional; default to []
// to satisfy the type at the call boundary before the service overrides it.
function withDefaultedProdukte(event: ReturnType<typeof patchBodySchema.parse>['event']): OnboardingEvent {
  if (
    event.type === 'KRANKENKASSE_OCR_ABGESCHLOSSEN' ||
    event.type === 'KRANKENKASSE_UEBERSPRUNGEN' ||
    event.type === 'WARENKORB_UEBERNOMMEN'
  ) {
    return { ...event, produkte: event.produkte ?? [] };
  }
  return event;
}
