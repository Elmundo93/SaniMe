import { UnauthorizedException } from '@nestjs/common';
import { CustomerSessionStrategy } from './customer-session.strategy';
import type { CustomerSessionSecretPort } from '../ports/customer-session-secret.port';

describe('CustomerSessionStrategy', () => {
  it('resolves a valid secret to a session lookup', async () => {
    const port: CustomerSessionSecretPort = {
      resolveSecret: jest.fn().mockResolvedValue({ sessionId: 's1', customerId: null }),
    };
    const strategy = new CustomerSessionStrategy(port);

    const result = await strategy.validate('secret-1');

    expect(result).toEqual({ sessionId: 's1', customerId: null });
    expect(port.resolveSecret).toHaveBeenCalledWith('secret-1');
  });

  it('rejects an unknown secret', async () => {
    const port: CustomerSessionSecretPort = {
      resolveSecret: jest.fn().mockResolvedValue(null),
    };
    const strategy = new CustomerSessionStrategy(port);

    await expect(strategy.validate('bad-secret')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
