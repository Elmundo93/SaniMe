import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminUsersRepository } from '../admin-users.repository';
import { ADMIN_COOKIE, leseCookie, type AdminAccessPayload } from '../services/admin-session.service';

export type AdminJwtPayload = AdminAccessPayload;

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  // 'cookie' = Web-App (CSRF-Header nötig, Sitzung gleitet), 'bearer' = Tests/Skripte.
  quelle: 'cookie' | 'bearer';
  payload: AdminAccessPayload;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ausCookie(request: Request): string | null {
  return leseCookie(request, ADMIN_COOKIE);
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    private readonly adminUsers: AdminUsersRepository,
  ) {
    super({
      // Bearer zuerst: ein expliziter Header ist eindeutiger als ein Cookie.
      jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ausCookie]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('ADMIN_JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  // Zwischen-Token des Logins (typ 'mfa') sind mit demselben Secret signiert
  // und dürfen hier nie als Zugang durchgehen. Deaktivierte Personen verlieren
  // den Zugang sofort, nicht erst mit Ablauf ihres Tokens.
  async validate(request: Request, payload: AdminAccessPayload & { typ?: string }): Promise<AuthenticatedAdmin> {
    if ((payload.typ !== undefined && payload.typ !== 'access') || !UUID.test(payload.sub)) {
      throw new UnauthorizedException('Bitte melde dich an.');
    }
    const admin = await this.adminUsers.findById(payload.sub);
    if (!admin || admin.deactivatedAt) {
      throw new UnauthorizedException('Bitte melde dich an.');
    }
    const quelle = ExtractJwt.fromAuthHeaderAsBearerToken()(request) ? 'bearer' : 'cookie';
    return { id: admin.id, email: admin.email, name: admin.name, quelle, payload };
  }
}
