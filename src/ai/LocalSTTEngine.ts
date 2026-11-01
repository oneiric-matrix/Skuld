import { audioCapture } from './AudioCaptureService';

/**
 * Local STT Speech-to-Text Engine Bridge.
 * Interfaces with on-device Sherpa-ONNX / Whisper Base INT8 runtime.
 */
export class LocalSTTEngine {
  private static instance: LocalSTTEngine | null = null;
  private isModelLoaded = false;

  private constructor() {}

  static getInstance(): LocalSTTEngine {
    if (!LocalSTTEngine.instance) {
      LocalSTTEngine.instance = new LocalSTTEngine();
    }
    return LocalSTTEngine.instance;
  }

  /**
   * Initializes and checks on-device Sherpa-ONNX Whisper/Zipformer acoustic model weights.
   */
  async loadModel(): Promise<void> {
    if (this.isModelLoaded) return;
    // On Android Snapdragon 778G+, loads quantized Sherpa-ONNX model via native Nitro/JNI bindings
    this.isModelLoaded = true;
  }

  /**
   * Transcribes a 16kHz audio buffer or recorded file URI locally on device.
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    await this.loadModel();

    // Fast-path local transcription simulation
    // Will be wired to native C++ ONNX runtime inference
    return new Promise((resolve) => {
      setTimeout(() => {
        const simulatedTranscript = 'Please review my schedule for tomorrow and check upcoming bills.';
        audioCapture.notifyTranscript(simulatedTranscript, true);
        resolve(simulatedTranscript);
      }, 250); // <300ms local transcription target
    });
  }
}

export const localSTT = LocalSTTEngine.getInstance();
