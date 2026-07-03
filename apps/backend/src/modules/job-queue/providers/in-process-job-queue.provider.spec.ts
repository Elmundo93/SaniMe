import { InProcessJobQueue } from './in-process-job-queue.provider';
import type { JobHandler } from '../ports/job-queue.port';

describe('InProcessJobQueue', () => {
  let queue: InProcessJobQueue;

  beforeEach(() => {
    jest.useFakeTimers();
    queue = new InProcessJobQueue();
  });

  afterEach(() => {
    queue.onModuleDestroy();
    jest.useRealTimers();
  });

  it('runs a registered handler for an enqueued job', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler({ jobName: 'test.job', handle });

    await queue.enqueue('test.job', { foo: 'bar' });
    await jest.runOnlyPendingTimersAsync();

    expect(handle).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('respects delayMs before running the handler', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler({ jobName: 'delayed.job', handle });

    await queue.enqueue('delayed.job', {}, { delayMs: 5000 });
    await jest.advanceTimersByTimeAsync(1000);
    expect(handle).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(4000);
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('retries with exponential backoff up to the attempts limit, then gives up', async () => {
    const handle = jest.fn().mockRejectedValue(new Error('boom'));
    queue.registerHandler({ jobName: 'failing.job', handle });

    await queue.enqueue('failing.job', {}, { attempts: 3 });
    await jest.runAllTimersAsync();

    expect(handle).toHaveBeenCalledTimes(3);
  });

  it('succeeds on a later retry without exhausting all attempts', async () => {
    const handle = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    queue.registerHandler({ jobName: 'flaky.job', handle });

    await queue.enqueue('flaky.job', {}, { attempts: 3 });
    await jest.runAllTimersAsync();

    expect(handle).toHaveBeenCalledTimes(2);
  });

  it('logs rather than throws when no handler is registered for a job name', async () => {
    await queue.enqueue('unregistered.job', {});
    await expect(jest.runOnlyPendingTimersAsync()).resolves.not.toThrow();
  });

  it('never schedules a real repeat timer in the test environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const handle = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler({ jobName: 'repeating.job', handle });

    await queue.enqueue('repeating.job', {}, { repeat: { everyMs: 1000 } });
    await jest.advanceTimersByTimeAsync(10000);

    expect(handle).not.toHaveBeenCalled();
    process.env.NODE_ENV = originalEnv;
  });

  it('onModuleDestroy clears pending timers so they never fire afterward', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler({ jobName: 'cleanup.job', handle });

    await queue.enqueue('cleanup.job', {}, { delayMs: 5000 });
    queue.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(10000);

    expect(handle).not.toHaveBeenCalled();
  });

  it('registerHandler is idempotent per job name (last registration wins)', async () => {
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);
    const handler: JobHandler = { jobName: 'same.job', handle: first };
    queue.registerHandler(handler);
    queue.registerHandler({ jobName: 'same.job', handle: second });

    await queue.enqueue('same.job', {});
    await jest.runOnlyPendingTimersAsync();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
