import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import type { CustomerSessionLookup, CustomerSessionSecretPort } from '../../auth/ports/customer-session-secret.port';
import { OnboardingSessionsRepository } from '../onboarding-sessions.repository';

// The real CustomerSessionSecretPort implementation — finally gives
// CustomerSessionStrategy a working provider (Layer 1 registered only an
// inert stub). OnboardingSessionsRepository is itself a "leaf" provider
// (needs only DRIZZLE), so both are registered directly in AuthModule via
// `useClass`/plain providers, with zero Nest-module-level dependency on
// OnboardingModule (avoids a circular module import).
@Injectable()
export class CustomerSessionSecretAdapter implements CustomerSessionSecretPort {
  constructor(private readonly sessions: OnboardingSessionsRepository) {}

  async resolveSecret(secret: string): Promise<CustomerSessionLookup | null> {
    const hash = createHash('sha256').update(secret).digest('hex');
    const session = await this.sessions.findBySecretHash(hash);
    if (!session) {
      return null;
    }
    return { sessionId: session.id, customerId: session.customerId };
  }
}
