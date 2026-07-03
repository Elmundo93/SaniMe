import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerSessionAuthGuard extends AuthGuard('customer-session') {
  // Mirrors AdminJwtAuthGuard's handleRequest override — populates
  // req.customer so AccessLogInterceptor and ownership checks (e.g.
  // PATCH /onboarding-sessions/:id) have a stable field to read.
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser {
    const customer = super.handleRequest(err, user, info, context);
    const request = context.switchToHttp().getRequest();
    request.customer = customer;
    return customer;
  }
}
