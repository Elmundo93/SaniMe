import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';
import { ADMIN_CSRF_HEADER, AdminSessionService } from '../services/admin-session.service';

const LESEND = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {
  constructor(private readonly session: AdminSessionService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    const admin = request.admin as AuthenticatedAdmin;
    if (admin.quelle === 'cookie') {
      if (!LESEND.has(request.method) && request.headers[ADMIN_CSRF_HEADER] !== '1') {
        throw new ForbiddenException('Anfrage abgelehnt. Bitte lade die Seite neu und versuche es erneut.');
      }
      await this.session.verlaengern(context.switchToHttp().getResponse(), admin, admin.payload);
    }
    return ok;
  }

  // Populates `req.admin` (not just Passport's default `req.user`) so
  // AccessLogInterceptor and future admin-scoped code have a stable,
  // guard-specific field to read regardless of which strategy also ran.
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser {
    const admin = super.handleRequest(err, user, info, context);
    const request = context.switchToHttp().getRequest();
    request.admin = admin;
    return admin;
  }
}
