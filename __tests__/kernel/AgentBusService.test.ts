import { agentBus, InterAgentQuery, DomainEvent } from '../../src/kernel/AgentBusService';
import { jobQueue } from '../../src/queue/JobQueue';

jest.mock('../../src/queue/JobQueue', () => ({
  jobQueue: {
    enqueue: jest.fn(async (_agentId, _jobType, _payload, _options) => 'job_mock_123'),
    registerHandler: jest.fn(),
  },
}));

describe('AgentBusService (Central Orchestration Kernel)', () => {
  beforeEach(() => {
    agentBus.clearAllHandlers();
    jest.clearAllMocks();
  });

  test('positive: should successfully register and execute synchronous askAgent query', async () => {
    agentBus.registerQueryHandler<{ restriction: string }, { isRestricted: boolean }>(
      'health',
      'check_dietary_flag',
      async (query: InterAgentQuery<{ restriction: string }>) => {
        expect(query.fromAgentId).toBe('chef');
        expect(query.payload.restriction).toBe('dairy');
        return { isRestricted: true };
      }
    );

    const response = await agentBus.askAgent<{ restriction: string }, { isRestricted: boolean }>(
      'chef',
      'health',
      'check_dietary_flag',
      { restriction: 'dairy' }
    );

    expect(response.success).toBe(true);
    expect(response.fromAgentId).toBe('health');
    expect(response.data?.isRestricted).toBe(true);
  });

  test('negative: should return error if target agent has no handler for query', async () => {
    const response = await agentBus.askAgent('butler', 'accounts', 'unknown_query', {});
    expect(response.success).toBe(false);
    expect(response.errorMessage).toContain("does not support query 'unknown_query'");
  });

  test('negative: should catch and encapsulate thrown handler exceptions', async () => {
    agentBus.registerQueryHandler('pm', 'failing_task', async () => {
      throw new Error('Database locked');
    });

    const response = await agentBus.askAgent('butler', 'pm', 'failing_task', {});
    expect(response.success).toBe(false);
    expect(response.errorMessage).toBe('Database locked');
  });

  test('positive: should delegate task to master job queue', async () => {
    const jobId = await agentBus.delegateTask({
      fromAgentId: 'chef',
      toAgentId: 'accounts',
      action: 'log_grocery_expense',
      payload: { amount: 54.2 },
      priority: 2,
    });

    expect(jobId).toBe('job_mock_123');
    expect(jobQueue.enqueue).toHaveBeenCalledWith(
      'accounts',
      'inter_agent_delegation',
      expect.objectContaining({ action: 'log_grocery_expense' }),
      { priority: 2 }
    );
  });

  test('negative: should throw error if destination agent or action is missing in task delegation', async () => {
    await expect(
      agentBus.delegateTask({
        fromAgentId: 'chef',
        toAgentId: '',
        action: 'log_expense',
        payload: {},
      })
    ).rejects.toThrow('Destination agentId and action are required');
  });

  test('positive: should publish and receive domain events over broadcast bus', async () => {
    const receivedEvents: any[] = [];
    const unsubscribe = agentBus.subscribeToEvent<{ distanceKm: number }>(
      'workout_completed',
      (event: DomainEvent<{ distanceKm: number }>) => {
        receivedEvents.push(event);
      }
    );

    await agentBus.publishEvent('health', 'workout_completed', { distanceKm: 5.2 });

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].sourceAgentId).toBe('health');
    expect(receivedEvents[0].data.distanceKm).toBe(5.2);

    unsubscribe();
    await agentBus.publishEvent('health', 'workout_completed', { distanceKm: 10.0 });
    // Should not receive second event after unsubscribing
    expect(receivedEvents.length).toBe(1);
  });
});
