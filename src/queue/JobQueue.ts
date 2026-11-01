import { vaultDatabase } from '../security/VaultDatabase';
import { hardwareVault } from '../security/HardwareVault';
import { SkuldEnvelopeCodec, EncryptedEnvelope } from '../security/SkuldEnvelope';

export type JobPriority = 1 | 2 | 3 | 4 | 5; // 1 = Immediate UI, 5 = Low idle
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface EnqueuedJob<T = any> {
  id: string;
  agentId: string;
  jobType: string;
  payload: T;
  priority: JobPriority;
  status: JobStatus;
  errorMessage?: string;
  scheduledAt: number;
  createdAt: number;
  updatedAt: number;
}

export type JobHandler<T = any> = (job: EnqueuedJob<T>) => Promise<void>;

export class JobQueueManager {
  private static instance: JobQueueManager | null = null;
  private handlers = new Map<string, JobHandler>();
  private isProcessing = false;
  private loopInterval: any = null;

  private constructor() {}

  static getInstance(): JobQueueManager {
    if (!JobQueueManager.instance) {
      JobQueueManager.instance = new JobQueueManager();
    }
    return JobQueueManager.instance;
  }

  /**
   * Registers a worker handler for a specific job type.
   */
  registerHandler<T>(jobType: string, handler: JobHandler<T>): void {
    this.handlers.set(jobType, handler as JobHandler);
  }

  /**
   * Enqueues a new background job with its payload encrypted inside the vault.
   */
  async enqueue<T>(
    agentId: string,
    jobType: string,
    payload: T,
    options: {
      priority?: JobPriority;
      scheduledAt?: number;
    } = {}
  ): Promise<string> {
    const key = hardwareVault.getActiveKey();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const priority = options.priority ?? 3;
    const scheduledAt = options.scheduledAt ?? now;

    const envelope = await SkuldEnvelopeCodec.seal(payload, key);
    const envelopeJson = JSON.stringify(envelope);

    const db = vaultDatabase.getRawDb();
    await db.runAsync(
      `INSERT INTO job_queue (id, agent_id, job_type, payload_envelope_json, priority, status, scheduled_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?)`,
      [jobId, agentId, jobType, envelopeJson, priority, scheduledAt, now, now]
    );

    // Trigger immediate check
    this.tick().catch(() => {});
    return jobId;
  }

  /**
   * Starts background processing loop.
   */
  startQueueWorker(pollIntervalMs = 3000): void {
    if (this.loopInterval) return;
    this.loopInterval = setInterval(() => {
      this.tick().catch((err) => console.error('[JobQueue] Error during tick:', err));
    }, pollIntervalMs);
  }

  /**
   * Stops the background worker.
   */
  stopQueueWorker(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  /**
   * Executes a single dispatch tick, selecting highest priority scheduled jobs.
   */
  async tick(): Promise<void> {
    if (this.isProcessing) return;
    if (!hardwareVault.isUnlocked()) return; // Pause processing if vault is locked

    this.isProcessing = true;
    try {
      const db = vaultDatabase.getRawDb();
      const now = Date.now();

      // Fetch next job: order by priority ASC (1 is highest), scheduled_at ASC
      const row = await db.getFirstAsync<{
        id: string;
        agent_id: string;
        job_type: string;
        payload_envelope_json: string;
        priority: number;
        status: string;
        scheduled_at: number;
        created_at: number;
        updated_at: number;
      }>(
        `SELECT * FROM job_queue
         WHERE status = 'queued' AND scheduled_at <= ?
         ORDER BY priority ASC, scheduled_at ASC
         LIMIT 1`,
        [now]
      );

      if (!row) {
        this.isProcessing = false;
        return;
      }

      // Mark running
      await db.runAsync(
        `UPDATE job_queue SET status = 'running', updated_at = ? WHERE id = ?`,
        [Date.now(), row.id]
      );

      const handler = this.handlers.get(row.job_type);
      if (!handler) {
        await db.runAsync(
          `UPDATE job_queue SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?`,
          [`No handler registered for job type: ${row.job_type}`, Date.now(), row.id]
        );
        this.isProcessing = false;
        return;
      }

      // Decrypt payload
      const key = hardwareVault.getActiveKey();
      const envelope: EncryptedEnvelope = JSON.parse(row.payload_envelope_json);
      const payload = await SkuldEnvelopeCodec.unseal<any>(envelope, key);

      const job: EnqueuedJob = {
        id: row.id,
        agentId: row.agent_id,
        jobType: row.job_type,
        payload,
        priority: row.priority as JobPriority,
        status: 'running',
        scheduledAt: row.scheduled_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      try {
        await handler(job);
        await db.runAsync(
          `UPDATE job_queue SET status = 'completed', updated_at = ? WHERE id = ?`,
          [Date.now(), row.id]
        );
      } catch (err: any) {
        await db.runAsync(
          `UPDATE job_queue SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?`,
          [err?.message || 'Execution error', Date.now(), row.id]
        );
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const jobQueue = JobQueueManager.getInstance();
