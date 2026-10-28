import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminSessionService } from '../services/admin-session.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const codeSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(1),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
  }
  return parsed.data;
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly session: AdminSessionService,
  ) {}

  // Schritt 1: Passwort. Antwortet nie mit einer Sitzung — nur mit dem
  // Zwischen-Token für Schritt 2 (und beim ersten Mal den Daten zur 2FA-Einrichtung).
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: unknown) {
    const { email, password } = parse(loginSchema, body);
    return this.adminAuth.login(email, password, DEFAULT_TENANT_CONTEXT);
  }

  // Schritt 2: TOTP-Code → Sitzungs-Cookie.
  @Post('code')
  @HttpCode(HttpStatus.OK)
  async code(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const { challengeToken, code } = parse(codeSchema, body);
    const admin = await this.adminAuth.bestaetigeCode(challengeToken, code, DEFAULT_TENANT_CONTEXT);
    await this.session.ausstellen(response, admin);
    return this.adminAuth.profil(admin.id);
  }

  // Wer bin ich, was darf ich? Die Web-App blendet danach aus, was nicht
  // erlaubt ist — der Server prüft trotzdem jede Route selbst (RolesGuard).
  // Verlängert nebenbei die Sitzung („Angemeldet bleiben“).
  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  me(@CurrentAdmin() admin: { id: string }) {
    return this.adminAuth.profil(admin.id);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard)
  async logout(@CurrentAdmin() admin: { id: string }, @Res({ passthrough: true }) response: Response) {
    await this.adminAuth.abmelden(admin.id, DEFAULT_TENANT_CONTEXT);
    this.session.beenden(response);
  }
}
