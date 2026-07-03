export interface TransitionRule<S extends string, E extends { type: string }, C, DE = never> {
  from: S;
  event: E['type'];
  to: S;
  guard?: (context: C) => boolean;
  // Optional domain events emitted on a successful transition. Defaults to
  // `never` so existing machines (e.g. OnboardingWorkflow) are unaffected —
  // `events` is always `[]` for them, carrying no information the caller
  // needs to handle. SupplyWorkflow is the first real consumer.
  emit?: (context: C, event: E) => DE[];
}

export type WorkflowResult<C, DE = never> =
  | { ok: true; context: C; events: DE[] }
  | { ok: false; reason: string };

export function createWorkflow<S extends string, E extends { type: string }, C extends { status: S }, DE = never>(
  transitions: TransitionRule<S, E, C, DE>[],
  applyEventData: (context: C, event: E) => C,
) {
  return {
    transitions,
    transition(context: C, event: E): WorkflowResult<C, DE> {
      const rule = transitions.find((r) => r.from === context.status && r.event === event.type);
      if (!rule) {
        return { ok: false, reason: `Kein Übergang von ${context.status} mit ${event.type}` };
      }
      if (rule.guard && !rule.guard(context)) {
        return { ok: false, reason: `Vorbedingung für ${event.type} nicht erfüllt` };
      }
      const patched = applyEventData(context, event);
      return {
        ok: true,
        context: { ...patched, status: rule.to },
        events: rule.emit ? rule.emit(context, event) : [],
      };
    },
  };
}
