import { trace, type Span } from '@opentelemetry/api';

// Instrumentation seam only (Principle 13) — no SDK/exporter registered, so
// `trace.getTracer()` returns OpenTelemetry's no-op tracer until Layer 5 wires
// up a real one. Call sites don't change when that happens.
const tracer = trace.getTracer('sanime-backend');

// Every real call site added in Layer 5 wraps an async method — a plain
// try/finally would call span.end() the instant the promise is *created*,
// not when the awaited work actually finishes, reporting a near-zero
// duration for everything. Detect a thenable result and end the span only
// once it settles instead; synchronous callers behave exactly as before.
export function withSpan<T>(name: string, fn: (span: Span) => T): T {
  return tracer.startActiveSpan(name, (span) => {
    let result: T;
    try {
      result = fn(span);
    } catch (err) {
      span.recordException(err as Error);
      span.end();
      throw err;
    }
    if (result instanceof Promise) {
      return result.finally(() => span.end()) as T;
    }
    span.end();
    return result;
  });
}
