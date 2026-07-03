import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { scrub } from './scrub';

interface LogLine {
  level: string;
  message: string;
  context?: string;
  timestamp: string;
  [key: string]: unknown;
}

// Structured (JSON-line) logger with health-data scrubbing built in from the
// first route — there's nothing sensitive flowing through Layer 1 yet, but
// the mechanism has to exist before it does (Principle 13).
@Injectable()
export class StructuredLoggerService implements LoggerService {
  private write(level: string, message: unknown, context?: string, meta?: Record<string, unknown>) {
    const line: LogLine = {
      level,
      message: typeof message === 'string' ? message : JSON.stringify(scrub(message)),
      context,
      timestamp: new Date().toISOString(),
      ...(meta ? (scrub(meta) as Record<string, unknown>) : {}),
    };
    process.stdout.write(`${JSON.stringify(line)}\n`);
  }

  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace ? { trace } : undefined);
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('trace', message, context);
  }

  setLogLevels?(_levels: LogLevel[]) {
    // No-op: level filtering happens via LOG_LEVEL at the process/aggregator
    // level for this pilot, not per-call — nothing here needs it yet.
  }
}
