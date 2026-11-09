import { ocrEngine, OCRProcessingOptions, OCRResult } from './OCREngineService';
import { agentBus } from '../kernel/AgentBusService';

export interface CameraCaptureConfig {
  flashMode?: 'off' | 'on' | 'auto';
  quality?: number; // 0.1 - 1.0 (default 0.85)
  autoCropPerspective?: boolean;
}

export interface DocumentScanSession {
  sessionId: string;
  capturedImageUri: string;
  timestamp: number;
  ocrResult?: OCRResult;
  processingTimeMs?: number;
}

export type NativeCameraDriver = (config: CameraCaptureConfig) => Promise<{ uri: string }>;

/**
 * Camera Scanner Bridge Service.
 * Bridges native device camera feeds / photo capture with the modular OCREngineService.
 * Can be triggered directly by UI or programmatically via the central AgentBus.
 */
export class CameraScannerService {
  private static instance: CameraScannerService | null = null;
  private cameraDriver: NativeCameraDriver | null = null;
  private recentSessions: DocumentScanSession[] = [];

  private constructor() {
    this.registerBusHandlers();
  }

  static getInstance(): CameraScannerService {
    if (!CameraScannerService.instance) {
      CameraScannerService.instance = new CameraScannerService();
    }
    return CameraScannerService.instance;
  }

  /**
   * Registers Camera Scanner command handlers onto the central Agent Bus.
   */
  private registerBusHandlers(): void {
    // 1. Peer agents can request document scan from URI
    agentBus.registerQueryHandler<
      { imageUri: string; ocrOptions?: OCRProcessingOptions },
      DocumentScanSession
    >('scanner', 'scan_document_uri', async (query) => {
      return this.scanExistingImage(query.payload.imageUri, query.payload.ocrOptions);
    });

    // 2. Peer agents can trigger camera capture and scan
    agentBus.registerQueryHandler<
      { cameraConfig?: CameraCaptureConfig; ocrOptions?: OCRProcessingOptions },
      DocumentScanSession
    >('scanner', 'capture_and_scan', async (query) => {
      return this.captureAndScan(query.payload.cameraConfig, query.payload.ocrOptions);
    });
  }

  /**
   * Sets custom native camera capture driver (e.g. expo-camera or react-native-vision-camera).
   */
  setCameraDriver(driver: NativeCameraDriver): void {
    this.cameraDriver = driver;
  }

  resetCameraDriver(): void {
    this.cameraDriver = null;
  }

  /**
   * Scans an already captured or picked image URI with OCR.
   */
  async scanExistingImage(
    imageUri: string,
    ocrOptions: OCRProcessingOptions = {}
  ): Promise<DocumentScanSession> {
    if (!imageUri || !imageUri.trim()) {
      throw new Error('Image URI is required for document scan');
    }

    const startTime = Date.now();
    const ocrResult = await ocrEngine.processImage(imageUri, ocrOptions);
    const processingTimeMs = Date.now() - startTime;

    const session: DocumentScanSession = {
      sessionId: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      capturedImageUri: imageUri.trim(),
      timestamp: Date.now(),
      ocrResult,
      processingTimeMs,
    };

    this.recentSessions.unshift(session);
    if (this.recentSessions.length > 20) {
      this.recentSessions.pop();
    }

    return session;
  }

  /**
   * Triggers hardware camera shutter, captures photo frame, and passes through OCR pipeline.
   */
  async captureAndScan(
    cameraConfig: CameraCaptureConfig = {},
    ocrOptions: OCRProcessingOptions = {}
  ): Promise<DocumentScanSession> {
    const quality = cameraConfig.quality ?? 0.85;
    if (quality <= 0 || quality > 1.0) {
      throw new Error('Camera quality must be between 0.1 and 1.0');
    }

    let photoUri: string;
    if (this.cameraDriver) {
      const captureResult = await this.cameraDriver(cameraConfig);
      photoUri = captureResult.uri;
    } else {
      // Default local simulated capture frame
      photoUri = `file:///data/user/0/com.skuld/cache/capture_${Date.now()}.jpg`;
    }

    return this.scanExistingImage(photoUri, ocrOptions);
  }

  getRecentSessions(): DocumentScanSession[] {
    return [...this.recentSessions];
  }

  clearSessions(): void {
    this.recentSessions = [];
  }
}

export const cameraScanner = CameraScannerService.getInstance();
