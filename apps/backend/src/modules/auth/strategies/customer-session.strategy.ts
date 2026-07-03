import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { CUSTOMER_SESSION_SECRET_PORT, type CustomerSessionSecretPort } from '../ports/customer-session-secret.port';

// Registered in AuthModule with an inert stub CustomerSessionSecretPort
// (always "no match") until Onboarding's module provides the real adapter —
// see auth.module.ts. Proven directly via unit test against a fake port too.
@Injectable()
export class CustomerSessionStrategy extends PassportStrategy(Strategy, 'customer-session') {
  constructor(@Inject(CUSTOMER_SESSION_SECRET_PORT) private readonly port: CustomerSessionSecretPort) {
    super();
  }

  async validate(token: string) {
    const lookup = await this.port.resolveSecret(token);
    if (!lookup) {
      throw new UnauthorizedException('Ungültiges Session-Secret');
    }
    return lookup;
  }
}
