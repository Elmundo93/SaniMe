import { alleVersorgungenTerminal, DeletionRequestWorkflow, erstelleAnfrageZurLoeschung, type DeletionRequestContext } from './deletion-request';

function apply(context: DeletionRequestContext, events: { type: string }[]) {
  let current = context;
  const allEvents: unknown[] = [];
  for (const event of events) {
    const result = DeletionRequestWorkflow.transition(current, event as any);
    if (!result.ok) {
      throw new Error(`Unexpected failure on ${event.type}: ${result.reason}`);
    }
    current = result.context;
    allEvents.push(...result.events);
  }
  return { context: current, events: allEvents };
}

describe('alleVersorgungenTerminal', () => {
  it('is true when every supply is in a terminal status', () => {
    expect(alleVersorgungenTerminal(['delivered', 'completed', 'archived', 'rejected'])).toBe(true);
    expect(alleVersorgungenTerminal([])).toBe(true);
  });

  it('is false when any supply is still in flight', () => {
    expect(alleVersorgungenTerminal(['delivered', 'submitted'])).toBe(false);
    expect(alleVersorgungenTerminal(['appointment_scheduled'])).toBe(false);
  });
});

describe('DeletionRequestWorkflow', () => {
  it('approves once reviewed, when every supply is terminal, emitting 2 events for the review+approve replay', () => {
    const request = erstelleAnfrageZurLoeschung('del-1', ['delivered', 'archived']);
    const { context, events } = apply(request, [{ type: 'ReviewStarted' }, { type: 'Approved' }]);

    expect(context.status).toBe('approved');
    expect(events).toHaveLength(2);
    expect((events[0] as any).type).toBe('ReviewStarted');
    expect((events[1] as any).type).toBe('Approved');
    expect((events[1] as any).deletionRequestId).toBe('del-1');
  });

  it('rejects the Approved transition while a supply is still in flight (the guard)', () => {
    const request = erstelleAnfrageZurLoeschung('del-2', ['submitted']);
    const underReview = apply(request, [{ type: 'ReviewStarted' }]).context;

    const result = DeletionRequestWorkflow.transition(underReview, { type: 'Approved' });
    expect(result.ok).toBe(false);
  });

  it('drives approved through executing to completed', () => {
    const request = erstelleAnfrageZurLoeschung('del-3', []);
    const { context } = apply(request, [
      { type: 'ReviewStarted' },
      { type: 'Approved' },
      { type: 'ExecutionStarted' },
      { type: 'ExecutionCompleted' },
    ]);
    expect(context.status).toBe('completed');
  });

  it('supports rejection and cancellation branches', () => {
    const rejected = apply(erstelleAnfrageZurLoeschung('del-4', []), [{ type: 'ReviewStarted' }, { type: 'Rejected' }]);
    expect(rejected.context.status).toBe('rejected');

    const cancelledFromRequested = apply(erstelleAnfrageZurLoeschung('del-5', []), [{ type: 'Cancelled' }]);
    expect(cancelledFromRequested.context.status).toBe('cancelled');

    const cancelledFromReview = apply(erstelleAnfrageZurLoeschung('del-6', []), [{ type: 'ReviewStarted' }, { type: 'Cancelled' }]);
    expect(cancelledFromReview.context.status).toBe('cancelled');
  });

  it('rejects an event with no matching transition row', () => {
    const request = erstelleAnfrageZurLoeschung('del-7', []);
    const result = DeletionRequestWorkflow.transition(request, { type: 'ExecutionCompleted' });
    expect(result.ok).toBe(false);
  });
});
