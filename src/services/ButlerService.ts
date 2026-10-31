import { jobQueue, EnqueuedJob } from '../queue/JobQueue';
import { vaultDatabase, AgentConfigRecord } from '../security/VaultDatabase';
import { hardwareVault } from '../security/HardwareVault';

export interface QuickCapturePayload {
  inputMode: 'voice' | 'text';
  rawText?: string;
  audioBlobUri?: string;
  source: 'home_widget' | 'hud' | 'app';
  timestamp: number;
}

export class ButlerService {
  private static instance: ButlerService | null = null;

  private constructor() {
    this.registerJobHandlers();
  }

  static getInstance(): ButlerService {
    if (!ButlerService.instance) {
      ButlerService.instance = new ButlerService();
    }
    return ButlerService.instance;
  }

  /**
   * Registers default job consumers for inter-agent routing and quick capture.
   */
  private registerJobHandlers(): void {
    // Handler for home screen widget & quick capture inputs
    jobQueue.registerHandler<QuickCapturePayload>('quick_capture_dispatch', async (job) => {
      await this.processQuickCaptureJob(job);
    });

    // Handler for scheduled inter-agent reminders
    jobQueue.registerHandler<{ reminderText: string; targetAgent: string }>(
      'agent_reminder_dispatch',
      async (job) => {
        console.log(`[Butler] Triggering reminder for ${job.agentId}:`, job.payload.reminderText);
      }
    );
  }

  /**
   * Dispatches a quick-capture recording or text message triggered by a Home Screen Widget.
   */
  async handleWidgetCapture(agentId: string, payload: QuickCapturePayload): Promise<string> {
    return await jobQueue.enqueue(agentId, 'quick_capture_dispatch', payload, {
      priority: 1, // Highest priority: user just tapped and submitted from home screen
    });
  }

  /**
   * Background processor for a captured request.
   */
  private async processQuickCaptureJob(job: EnqueuedJob<QuickCapturePayload>): Promise<void> {
    console.log(`[Butler] Processing quick capture for agent: ${job.agentId}`, job.payload);

    // In full pipeline:
    // 1. If voice -> Transcribe with Sherpa-ONNX streaming STT
    // 2. Load agent persona & decrypt memories
    // 3. Invoke LLM with agent's domain tools
    // 4. Save results to agent's domain table or push local notification

    // Record interaction as confidential episodic memory
    await vaultDatabase.storeEncryptedMemory({
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      agentId: job.agentId,
      category: 'habit',
      data: {
        lastInteraction: job.payload,
        status: 'processed_in_background',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  /**
   * Returns list of configured agents for home screen widgets or HUD selection.
   */
  async getAgentRoster(): Promise<AgentConfigRecord[]> {
    return await vaultDatabase.getAgents();
  }
}

export const butlerService = ButlerService.getInstance();
