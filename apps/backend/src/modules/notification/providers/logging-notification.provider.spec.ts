import type { ConfigService } from '@nestjs/config';
import { NotImplementedException } from '@nestjs/common';
import { LoggingNotificationProvider } from './logging-notification.provider';

// A minimal fake rather than a real ConfigService — @nestjs/config's actual
// precedence between its constructor object and process.env is ambiguous
// across a shared Jest worker process (another spec's `dotenv/config` import
// can mutate process.env.NODE_ENV for the whole worker), so asserting
// against a real ConfigService instance here would be flaky depending on
// test execution order.
function fakeConfig(nodeEnv: string): ConfigService {
  return { get: () => nodeEnv } as unknown as ConfigService;
}

describe('LoggingNotificationProvider', () => {
  const message = { channel: 'push' as const, target: 'token', title: 'Titel', body: 'Text' };

  it('logs and resolves in non-production', async () => {
    const provider = new LoggingNotificationProvider(fakeConfig('development'));
    await expect(provider.send(message)).resolves.toBeUndefined();
  });

  it('throws in production rather than faking delivery', async () => {
    const provider = new LoggingNotificationProvider(fakeConfig('production'));
    await expect(provider.send(message)).rejects.toBeInstanceOf(NotImplementedException);
  });
});
