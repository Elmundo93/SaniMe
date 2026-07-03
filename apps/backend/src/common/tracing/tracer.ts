import { trace, type Span } from '@opentelemetry/api';

// Instrumentation seam only (Principle 13) — no SDK/exporter registered, so
// `trace.getTracer()` returns OpenTelemetry's no-op tracer until Layer 5 wires
// up a real one. Call sites don't change when that happens.
const tracer = trace.getTracer('sanime-backend');

export function withSpan<T>(name: string, fn: (span: Span) => T): T {
  return tracer.startActiveSpan(name, (span) => {
    try {
      return fn(span);
    } finally {
      span.end();
    }
  });
}
