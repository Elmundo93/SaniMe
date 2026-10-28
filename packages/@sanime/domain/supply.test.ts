import { erstelleLeereSupply, SupplyWorkflow, type SupplyContext } from './supply';

function apply(context: SupplyContext, events: { type: string }[]) {
  let current = context;
  const allEvents: unknown[] = [];
  for (const event of events) {
    const result = SupplyWorkflow.transition(current, event as any);
    if (!result.ok) {
      throw new Error(`Unexpected failure on ${event.type}: ${result.reason}`);
    }
    current = result.context;
    allEvents.push(...result.events);
  }
  return { context: current, events: allEvents };
}

describe('SupplyWorkflow', () => {
  it('replays the onboarding-completion sequence to submitted with 5 events', () => {
    const supply = erstelleLeereSupply('supply-1');
    const { context, events } = apply(supply, [
      { type: 'SupplyCreated' },
      { type: 'DocumentsUploaded' },
      { type: 'OcrVerified' },
      { type: 'CustomerConfirmationReceived' },
      { type: 'Submitted' },
    ]);

    expect(context.status).toBe('submitted');
    expect(events).toHaveLength(5);
    expect((events[0] as any).type).toBe('SupplyCreated');
    expect((events[0] as any).supplyId).toBe('supply-1');
    expect((events[4] as any).type).toBe('Submitted');
  });

  it('waits for the insurer only after the application was actually sent', () => {
    const submitted: SupplyContext = { id: 'supply-a', status: 'submitted' };
    const { context } = apply(submitted, [{ type: 'AntragVersendet' }, { type: 'InsuranceApproved' }]);
    expect(context.status).toBe('approved');
  });

  it('releases a self-pay supply without an insurer decision', () => {
    const submitted: SupplyContext = { id: 'supply-s', status: 'submitted' };
    expect(apply(submitted, [{ type: 'OhneGenehmigungFreigegeben' }]).context.status).toBe('approved');
    const result = SupplyWorkflow.transition({ id: 'x', status: 'insurance_review' }, { type: 'OhneGenehmigungFreigegeben' });
    expect(result.ok).toBe(false);
  });

  it('drives the full happy path from submitted through archived', () => {
    const submitted: SupplyContext = { id: 'supply-2', status: 'submitted' };
    const { context } = apply(submitted, [
      { type: 'InsuranceApproved' },
      { type: 'SupplierAssigned' },
      { type: 'Ordered' },
      { type: 'AppointmentScheduled' },
      { type: 'Delivered' },
      { type: 'Completed' },
      { type: 'Archived' },
    ]);
    expect(context.status).toBe('archived');
  });

  it('supports the rejected branch reaching archived', () => {
    const submitted: SupplyContext = { id: 'supply-3', status: 'submitted' };
    const { context } = apply(submitted, [{ type: 'InsuranceRejected' }, { type: 'Archived' }]);
    expect(context.status).toBe('archived');
  });

  it('rejects an event with no matching transition row', () => {
    const supply = erstelleLeereSupply('supply-4');
    const result = SupplyWorkflow.transition(supply, { type: 'Delivered' });
    expect(result.ok).toBe(false);
  });
});
