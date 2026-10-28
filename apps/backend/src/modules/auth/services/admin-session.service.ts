import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';

// Admin-Sitzung der Web-App: JWT in einem httpOnly-Cookie (nie im
// localStorage, kein Zugriff aus JavaScript), SameSite=Strict, nur unter /api.
// Gleitend: jede Anfrage verlängert die Sitzung um INAKTIVITAET_MS, bis das
// absolute Maximum (ADMIN_JWT_EXPIRES_IN, Standard 8 h ab Anmeldung) erreicht ist.
//
// Bearer-Token (Tests, Skripte) funktionieren weiter — CSRF betrifft nur
// Cookies, weil der Browser sie von selbst mitschickt. Für Cookie-Anfragen
// mit Schreibzugriff verlangt AdminJwtAuthGuard deshalb ADMIN_CSRF_HEADER:
// ein eigener Header geht von fremden Seiten nur per CORS-Preflight, und CORS
// ist nicht freigeschaltet.
export const ADMIN_COOKIE = 'sanime_admin';
export const ADMIN_CSRF_HEADER = 'x-sanime-admin';
export const INAKTIVITAET_MS = 30 * 60 * 1000;
// Nicht bei jeder Anfrage neu signieren — eine Minute Ruhe reicht.
const ERNEUERN_NACH_MS = 60 * 1000;

export interface AdminAccessPayload {
  sub: string;
  email: string;
  typ?: 'access';
  // Zeitpunkt der Anmeldung (ms) — Grundlage des absoluten Sitzungsendes.
  authTime?: number;
  iat?: number;
}

export function leseCookie(request: Request, name: string): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const teil of header.split(';')) {
    const [schluessel, ...wert] = teil.trim().split('=');
    if (schluessel === name) return decodeURIComponent(wert.join('='));
  }
  return null;
}

function dauerMs(text: string): number {
  const treffer = /^(\d+)\s*([smhd])$/.exec(text.trim());
  if (!treffer) return 8 * 60 * 60 * 1000;
  const faktor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[treffer[2] as 's' | 'm' | 'h' | 'd'];
  return Number(treffer[1]) * faktor;
}

@Injectable()
export class AdminSessionService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get maxMs() {
    return dauerMs(this.config.get<string>('ADMIN_JWT_EXPIRES_IN', '8h'));
  }

  async ausstellen(response: Response, admin: { id: string; email: string }, authTime = Date.now()) {
    const restMs = Math.min(INAKTIVITAET_MS, authTime + this.maxMs - Date.now());
    const payload: AdminAccessPayload = { sub: admin.id, email: admin.email, typ: 'access', authTime };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('ADMIN_JWT_SECRET'),
      expiresIn: Math.max(1, Math.floor(restMs / 1000)),
    });
    response.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/api',
      maxAge: restMs,
    });
  }

  async verlaengern(response: Response, admin: { id: string; email: string }, payload: AdminAccessPayload) {
    if (!payload.authTime || !payload.iat) return;
    const jetzt = Date.now();
    if (jetzt - payload.iat * 1000 < ERNEUERN_NACH_MS) return;
    if (payload.authTime + this.maxMs <= jetzt) return;
    await this.ausstellen(response, admin, payload.authTime);
  }

  beenden(response: Response) {
    response.clearCookie(ADMIN_COOKIE, { path: '/api', httpOnly: true, sameSite: 'strict' });
  }
}
