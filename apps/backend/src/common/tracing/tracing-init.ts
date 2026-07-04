import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';

// Same no-op-unless-configured discipline as Sentry in main.ts — unset in
// dev/test (every existing test run stays a pure no-op, matching Layers 1-4's
// "init no-ops under test env" precedent), set only where a collector/OTLP
// endpoint actually exists. tracer.ts itself needs zero changes: registering
// a provider here is enough for trace.getTracer() to start returning a real
// tracer instead of OpenTelemetry's built-in no-op.
export function initTracing(): void {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ 'service.name': 'sanime-backend' }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint }))],
  });
  provider.register();
}
