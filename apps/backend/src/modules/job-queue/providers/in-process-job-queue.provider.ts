import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { JobHandler, JobOptions, JobQueue } from '../ports/job-queue.port';

const DEFAULT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

@Injectable()
export class InProcessJobQueue implements JobQueue, OnModuleDestroy {
  private readonly logger = new Logger(InProcessJobQueue.name);
  private readonly handlers = new Map<string, JobHandler>();
  private readonly timers = new Set<NodeJS.Timeout>();

  registerHandler(handler: JobHandler): void {
    this.handlers.set(handler.jobName, handler);
  }

  async enqueue<TPayload>(jobName: string, payload: TPayload, options: JobOptions = {}): Promise<{ id: string }> {
    const id = options.jobId ?? randomUUID();
    const attempts = options.attempts ?? DEFAULT_ATTEMPTS;

    if (options.repeat) {
      // Never schedule a real repeating timer in tests — it would outlive
      // app.close() and keep Jest's process alive across unrelated specs
      // (JobQueueModule is @Global(), so every e2e spec boots it).
      if (process.env.NODE_ENV === 'test') {
        return { id };
      }
      const interval = setInterval(() => {
        void this.runWithRetry(jobName, payload, attempts);
      }, options.repeat.everyMs);
      this.timers.add(interval);
      return { id };
    }

    const timer = setTimeout(() => {
      this.timers.delete(timer);
      void this.runWithRetry(jobName, payload, attempts);
    }, options.delayMs ?? 0);
    this.timers.add(timer);
    return { id };
  }

  onModuleDestroy() {
    for (const timer of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.clear();
  }

  private async runWithRetry(jobName: string, payload: unknown, attemptsLeft: number, attempt = 1): Promise<void> {
    const handler = this.handlers.get(jobName);
    if (!handler) {
      this.logger.error(`Kein Handler registriert für Job "${jobName}"`);
      return;
    }
    try {
      await handler.handle(payload);
    } catch (error) {
      if (attempt >= attemptsLeft) {
        this.logger.error(
          `Job "${jobName}" endgültig fehlgeschlagen nach ${attempt} Versuchen`,
          error instanceof Error ? error.stack : undefined,
        );
        return;
      }
      const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        void this.runWithRetry(jobName, payload, attemptsLeft, attempt + 1);
      }, backoff);
      this.timers.add(timer);
    }
  }
}
