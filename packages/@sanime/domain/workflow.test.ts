import { createWorkflow } from './workflow';

type Status = 'idle' | 'running' | 'done';
type Event = { type: 'START' } | { type: 'FINISH'; result: string };
interface Context {
  status: Status;
  log: string[];
}
type DomainEvent = { type: 'Started' } | { type: 'Finished'; result: string };

function buildMachine() {
  return createWorkflow<Status, Event, Context, DomainEvent>(
    [
      { from: 'idle', event: 'START', to: 'running', emit: () => [{ type: 'Started' }] },
      {
        from: 'running',
        event: 'FINISH',
        to: 'done',
        emit: (_ctx, event) => [{ type: 'Finished', result: (event as { type: 'FINISH'; result: string }).result }],
      },
    ],
    (context, event) => {
      if (event.type === 'FINISH') {
        return { ...context, log: [...context.log, event.result] };
      }
      return context;
    },
  );
}

describe('createWorkflow events mechanism', () => {
  it('returns emitted events on a successful transition', () => {
    const machine = buildMachine();
    const result = machine.transition({ status: 'idle', log: [] }, { type: 'START' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toEqual([{ type: 'Started' }]);
      expect(result.context.status).toBe('running');
    }
  });

  it('passes the triggering event through to emit()', () => {
    const machine = buildMachine();
    const result = machine.transition({ status: 'running', log: [] }, { type: 'FINISH', result: 'ok' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toEqual([{ type: 'Finished', result: 'ok' }]);
    }
  });

  it('returns an empty events array for a rule with no emit', () => {
    const machine = createWorkflow<Status, Event, Context>(
      [{ from: 'idle', event: 'START', to: 'running' }],
      (context) => context,
    );
    const result = machine.transition({ status: 'idle', log: [] }, { type: 'START' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toEqual([]);
    }
  });

  it('never calls emit on a failed transition', () => {
    const machine = buildMachine();
    const result = machine.transition({ status: 'done', log: [] }, { type: 'START' });
    expect(result.ok).toBe(false);
  });
});
