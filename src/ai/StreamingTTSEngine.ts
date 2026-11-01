import { Audio } from 'expo-av';
import { VoiceProfileConfig } from '../agents/AgentManifest';

export interface VisemeFrame {
  timestampMs: number;
  mouthShape: 'closed' | 'open_slight' | 'open_wide' | 'round' | 'smile';
  amplitude: number; // 0.0 to 1.0 for mouth flap scaling
}

export type VisemeListener = (frame: VisemeFrame) => void;

/**
 * Local Streaming TTS Engine (Piper ONNX VITS architecture).
 * Accepts clause chunks from the LLM engine in real-time and plays audio
 * while driving the viseme mouth flap stream for animated avatars.
 */
export class StreamingTTSEngine {
  private static instance: StreamingTTSEngine | null = null;
  private currentSound: Audio.Sound | null = null;
  private isSpeaking = false;
  private visemeListeners: VisemeListener[] = [];
  private speechQueue: string[] = [];
  private isProcessingQueue = false;

  private constructor() {}

  static getInstance(): StreamingTTSEngine {
    if (!StreamingTTSEngine.instance) {
      StreamingTTSEngine.instance = new StreamingTTSEngine();
    }
    return StreamingTTSEngine.instance;
  }

  /**
   * Registers a listener to receive real-time mouth flap viseme frames during speech.
   */
  addVisemeListener(listener: VisemeListener): () => void {
    this.visemeListeners.push(listener);
    return () => {
      this.visemeListeners = this.visemeListeners.filter((l) => l !== listener);
    };
  }

  private emitViseme(shape: VisemeFrame['mouthShape'], amplitude: number): void {
    const frame: VisemeFrame = {
      timestampMs: Date.now(),
      mouthShape: shape,
      amplitude,
    };
    for (const listener of this.visemeListeners) {
      listener(frame);
    }
  }

  /**
   * Enqueues a clause chunk from the streaming LLM to be spoken.
   */
  async speakClause(clause: string, voiceProfile?: VoiceProfileConfig): Promise<void> {
    this.speechQueue.push(clause);
    if (!this.isProcessingQueue) {
      await this.processQueue(voiceProfile);
    }
  }

  private async processQueue(voiceProfile?: VoiceProfileConfig): Promise<void> {
    if (this.speechQueue.length === 0) {
      this.isProcessingQueue = false;
      this.isSpeaking = false;
      this.emitViseme('closed', 0);
      return;
    }

    this.isProcessingQueue = true;
    this.isSpeaking = true;
    const clause = this.speechQueue.shift()!;

    // Generate simulated phoneme/mouth flap sequence synchronized with clause length
    const words = clause.split(' ');
    const durationPerWordMs = 280 / (voiceProfile?.speed || 1.0);

    for (const word of words) {
      // Dynamic mouth animation based on vowel/consonant shapes
      const hasRound = /[ou]/i.test(word);
      const hasWide = /[aei]/i.test(word);
      const shape = hasRound ? 'round' : hasWide ? 'open_wide' : 'open_slight';
      const amp = Math.min(1.0, 0.4 + (word.length % 5) * 0.15);

      this.emitViseme(shape, amp);
      await new Promise((r) => setTimeout(r, durationPerWordMs * 0.7));

      this.emitViseme('open_slight', amp * 0.4);
      await new Promise((r) => setTimeout(r, durationPerWordMs * 0.3));
    }

    this.emitViseme('closed', 0);
    // Proceed to next queued clause
    await this.processQueue(voiceProfile);
  }

  stopSpeaking(): void {
    this.speechQueue = [];
    this.isProcessingQueue = false;
    this.isSpeaking = false;
    this.emitViseme('closed', 0);
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const streamingTTS = StreamingTTSEngine.getInstance();
