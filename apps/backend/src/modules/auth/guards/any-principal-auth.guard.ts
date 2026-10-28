import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ADMIN_CSRF_HEADER } from '../services/admin-session.service';

// Passport's multi-strategy support: tries 'admin-jwt' then falls back to
// 'customer-session'. Used by read endpoints any authenticated principal may
// call (e.g. Catalog browsing). Sets req.admin/req.customer depending on
// which strategy matched, mirroring AdminJwtAuthGuard/CustomerSessionAuthGuard
// individually.
@Injectable()
export class AnyPrincipalAuthGuard extends AuthGuard(['admin-jwt', 'customer-session']) {
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser {
    const principal = super.handleRequest(err, user, info, context);
    const request = context.switchToHttp().getRequest();
    if (principal && typeof principal === 'object' && 'sessionId' in principal) {
      request.customer = principal;
    } else if (principal) {
      // Gleiche CSRF-Regel wie AdminJwtAuthGuard für die Cookie-Sitzung der Web-App.
      if (principal.quelle === 'cookie' && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers[ADMIN_CSRF_HEADER] !== '1') {
        throw new ForbiddenException('Anfrage abgelehnt. Bitte lade die Seite neu und versuche es erneut.');
      }
      request.admin = principal;
    }
    return principal;
  }
}
