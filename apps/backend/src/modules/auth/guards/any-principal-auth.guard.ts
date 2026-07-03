import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

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
      request.admin = principal;
    }
    return principal;
  }
}
