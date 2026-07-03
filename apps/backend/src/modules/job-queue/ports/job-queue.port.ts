export const JOB_QUEUE = Symbol('JOB_QUEUE');

// Shaped to mirror BullMQ's real API (jobId -> dedupe key, delayMs -> delay,
// attempts, repeat.everyMs -> repeat.every) so swapping the in-process
// implementation for real BullMQ later is a provider swap, not an
// interface change (Principle 10).
export interface JobOptions {
  jobId?: string;
  delayMs?: number;
  attempts?: number;
  repeat?: { everyMs: number };
}

export interface JobHandler<TPayload = unknown> {
  readonly jobName: string;
  handle(payload: TPayload): Promise<void>;
}

export interface JobQueue {
  enqueue<TPayload>(jobName: string, payload: TPayload, options?: JobOptions): Promise<{ id: string }>;
  registerHandler(handler: JobHandler): void;
}
