import { jobQueue, JobPriority } from '../queue/JobQueue';
import { vaultDatabase } from '../security/VaultDatabase';

export interface InterAgentQuery<TReq = any> {
  fromAgentId: string;
  toAgentId: string;
  queryType: string;
  payload: TReq;
  timestamp: number;
}

export interface InterAgentResponse<TRes = any> {
  success: boolean;
  fromAgentId: string;
  data?: TRes;
  errorMessage?: string;
  timestamp: number;
}

export interface InterAgentTask<TPayload = any> {
  fromAgentId: string;
  toAgentId: string;
  action: string;
  payload: TPayload;
  priority?: JobPriority;
}

export interface DomainEvent<TData = any> {
  eventId: string;
  sourceAgentId: string;
  eventType: string;
  data: TData;
  timestamp: number;
}

export type QueryHandler<TReq = any, TRes = any> = (
  query: InterAgentQuery<TReq>
) => Promise<TRes>;

export type DomainEventListener<TData = any> = (
  event: DomainEvent<TData>
) => Promise<void> | void;

/**
 * Central Orchestration Kernel: Skuld Agent Bus.
 * Pure system infrastructure facilitating peer-to-peer communication between agents.
 */
export class AgentBusService {
  private static instance: AgentBusService | null = null;
  private queryHandlers = new Map<string, QueryHandler>(); // key: `${agentId}:${queryType}`
  private eventSubscriptions = new Map<string, Set<DomainEventListener>>(); // key: eventType

  private constructor() {
    this.registerDelegatedTaskWorker();
  }

  static getInstance(): AgentBusService {
    if (!AgentBusService.instance) {
      AgentBusService.instance = new AgentBusService();
    }
    return AgentBusService.instance;
  }

  /**
   * Registers a worker handler in the central job queue for asynchronous delegated tasks.
   */
  private registerDelegatedTaskWorker(): void {
    jobQueue.registerHandler<InterAgentTask>('inter_agent_delegation', async (job) => {
      const task = job.payload;
      const handlerKey = `${task.toAgentId}:${task.action}`;
      const handler = this.queryHandlers.get(handlerKey);

      if (handler) {
        await handler({
          fromAgentId: task.fromAgentId,
          toAgentId: task.toAgentId,
          queryType: task.action,
          payload: task.payload,
          timestamp: job.createdAt,
        });
      } else {
        console.warn(`[AgentBus] No handler registered for delegated task: ${handlerKey}`);
      }
    });
  }

  /**
   * Registers a synchronous query handler for an agent domain.
   */
  registerQueryHandler<TReq, TRes>(
    agentId: string,
    queryType: string,
    handler: QueryHandler<TReq, TRes>
  ): void {
    const key = `${agentId}:${queryType}`;
    this.queryHandlers.set(key, handler as QueryHandler);
  }

  /**
   * Executes a synchronous cross-agent query (ask_agent).
   */
  async askAgent<TReq, TRes>(
    fromAgentId: string,
    toAgentId: string,
    queryType: string,
    payload: TReq
  ): Promise<InterAgentResponse<TRes>> {
    const handlerKey = `${toAgentId}:${queryType}`;
    const handler = this.queryHandlers.get(handlerKey);

    if (!handler) {
      return {
        success: false,
        fromAgentId: toAgentId,
        errorMessage: `Agent '${toAgentId}' does not support query '${queryType}'`,
        timestamp: Date.now(),
      };
    }

    try {
      const result = await handler({
        fromAgentId,
        toAgentId,
        queryType,
        payload,
        timestamp: Date.now(),
      });

      return {
        success: true,
        fromAgentId: toAgentId,
        data: result as TRes,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        fromAgentId: toAgentId,
        errorMessage: err?.message || 'Error executing cross-agent query',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Delegates an asynchronous task to another agent via the central master job queue.
   */
  async delegateTask<TPayload>(task: InterAgentTask<TPayload>): Promise<string> {
    if (!task.toAgentId || !task.action) {
      throw new Error('Destination agentId and action are required for task delegation');
    }

    return await jobQueue.enqueue(
      task.toAgentId,
      'inter_agent_delegation',
      task,
      {
        priority: task.priority || 3,
      }
    );
  }

  /**
   * Subscribes a listener to a specific broadcast domain event.
   */
  subscribeToEvent<TData>(eventType: string, listener: DomainEventListener<TData>): () => void {
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set());
    }
    const set = this.eventSubscriptions.get(eventType)!;
    set.add(listener as DomainEventListener);

    return () => {
      set.delete(listener as DomainEventListener);
    };
  }

  /**
   * Broadcasts a domain event across the Skuld Agent Bus.
   */
  async publishEvent<TData>(sourceAgentId: string, eventType: string, data: TData): Promise<void> {
    const event: DomainEvent<TData> = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      sourceAgentId,
      eventType,
      data,
      timestamp: Date.now(),
    };

    const listeners = this.eventSubscriptions.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          await listener(event);
        } catch (err) {
          console.error(`[AgentBus] Error in event listener for ${eventType}:`, err);
        }
      }
    }
  }

  /**
   * Clear all handlers (used for test teardown).
   */
  clearAllHandlers(): void {
    this.queryHandlers.clear();
    this.eventSubscriptions.clear();
  }
}

export const agentBus = AgentBusService.getInstance();
