import { metrics, type Counter, type Histogram } from '@opentelemetry/api';

// Unlike tracing's trace.getTracer() (a ProxyTracer that dynamically delegates
// to whatever provider is registered later), metrics.getMeter() resolves the
// *current* global MeterProvider immediately and permanently binds whatever
// instrument you create from it — a counter created before metrics-init.ts's
// setGlobalMeterProvider() runs stays a no-op forever, even after a real
// provider is registered. Creating each instrument lazily on first real use
// (always after main.ts's top-level initMetrics() call, since nothing here
// fires before a request reaches a service method) sidesteps that ordering
// trap while still only creating each instrument once.
function lazy<T>(create: () => T): () => T {
  let cached: T | undefined;
  return () => {
    if (!cached) cached = create();
    return cached;
  };
}

const meter = () => metrics.getMeter('sanime-backend');

const getOnboardingTransitionsCounter: () => Counter = lazy(() =>
  meter().createCounter('onboarding_transitions_total', {
    description: 'Erfolgreiche Onboarding-Session-Transitionen, nach Event-Typ',
  }),
);

const getSupplyTransitionsCounter: () => Counter = lazy(() =>
  meter().createCounter('supply_transitions_total', {
    description: 'Erfolgreiche Supply-Workflow-Transitionen, nach Event-Typ',
  }),
);

const getDataExportDurationHistogram: () => Histogram = lazy(() =>
  meter().createHistogram('data_export_generate_duration_ms', {
    description: 'Dauer der asynchronen Datenexport-Generierung in Millisekunden',
    unit: 'ms',
  }),
);

const getDeletionExecuteDurationHistogram: () => Histogram = lazy(() =>
  meter().createHistogram('deletion_execute_duration_ms', {
    description: 'Dauer der asynchronen Löschungs-Ausführung in Millisekunden',
    unit: 'ms',
  }),
);

export function recordOnboardingTransition(eventType: string): void {
  getOnboardingTransitionsCounter().add(1, { event: eventType });
}

export function recordSupplyTransition(eventType: string): void {
  getSupplyTransitionsCounter().add(1, { event: eventType });
}

export function recordDataExportDuration(ms: number): void {
  getDataExportDurationHistogram().record(ms);
}

export function recordDeletionExecuteDuration(ms: number): void {
  getDeletionExecuteDurationHistogram().record(ms);
}
