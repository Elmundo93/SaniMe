import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {
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
