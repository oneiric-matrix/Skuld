import { Audio } from 'expo-av';

export interface AudioRecordingResult {
  uri: string;
  durationMs: number;
  sampleRate: number;
}

export type STTTranscriptListener = (text: string, isFinal: boolean) => void;

export class AudioCaptureService {
  private static instance: AudioCaptureService | null = null;
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private transcriptListeners: STTTranscriptListener[] = [];

  private constructor() {}

  static getInstance(): AudioCaptureService {
    if (!AudioCaptureService.instance) {
      AudioCaptureService.instance = new AudioCaptureService();
    }
    return AudioCaptureService.instance;
  }

  /**
   * Request native audio recording permissions.
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Starts native audio capture formatted for Sherpa-ONNX / Whisper (16kHz 16-bit Mono PCM).
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    const granted = await this.requestPermissions();
    if (!granted) {
      throw new Error('Microphone permission not granted');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
      },
      ios: {
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {},
    });

    await recording.startAsync();
    this.recording = recording;
    this.isRecording = true;
  }

  /**
   * Stops recording and returns the recorded audio file URI.
   */
  async stopRecording(): Promise<AudioRecordingResult> {
    if (!this.recording || !this.isRecording) {
      throw new Error('No active recording in progress');
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    const status = await this.recording.getStatusAsync();
    this.isRecording = false;
    this.recording = null;

    if (!uri) {
      throw new Error('Failed to retrieve recording URI');
    }

    return {
      uri,
      durationMs: status.durationMillis,
      sampleRate: 16000,
    };
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }

  /**
   * Registers a callback for real-time streaming transcripts.
   */
  addTranscriptListener(listener: STTTranscriptListener): () => void {
    this.transcriptListeners.push(listener);
    return () => {
      this.transcriptListeners = this.transcriptListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Internal bridge for STT engine to notify UI listeners.
   */
  notifyTranscript(text: string, isFinal: boolean): void {
    for (const listener of this.transcriptListeners) {
      listener(text, isFinal);
    }
  }
}

export const audioCapture = AudioCaptureService.getInstance();
