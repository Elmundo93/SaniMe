import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { resourceFromAttributes } from '@opentelemetry/resources';

// Opt-in like tracing-init.ts's endpoint check — unset (the default, and every
// test env) keeps metrics.ts's instruments as pure no-ops. PrometheusExporter
// is itself a MetricReader that starts its own HTTP server (no Nest
// controller needed) — the "premature infra for a pilot" principle stops at
// not standing up a Prometheus/Grafana stack, not at skipping metrics
// entirely.
export function initMetrics(): void {
  if (process.env.METRICS_ENABLED !== 'true') return;

  const port = process.env.METRICS_PORT ? Number(process.env.METRICS_PORT) : 9464;
  const exporter = new PrometheusExporter({ port });
  const provider = new MeterProvider({
    resource: resourceFromAttributes({ 'service.name': 'sanime-backend' }),
    readers: [exporter],
  });
  metrics.setGlobalMeterProvider(provider);
}
