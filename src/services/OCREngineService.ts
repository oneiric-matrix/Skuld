import { agentBus } from '../kernel/AgentBusService';

export type OCRTargetDocumentType =
  | 'receipt'
  | 'invoice'
  | 'id_card'
  | 'document'
  | 'book_page'
  | 'handwritten_note'
  | 'general';

export interface OCRProcessingOptions {
  documentType?: OCRTargetDocumentType;
  enhanceContrast?: boolean;
  detectLanguage?: string; // e.g. "en", "fra", "deu"
  confidenceThreshold?: number; // 0.0 - 1.0 (default 0.6)
  boundingBoxes?: boolean; // whether to return bounding boxes per word
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRWord {
  text: string;
  confidence: number;
  box?: BoundingBox;
}

export interface OCRBlock {
  blockType: 'header' | 'paragraph' | 'line_item' | 'total' | 'table';
  text: string;
  confidence: number;
  words?: OCRWord[];
}

export interface OCRResult {
  fullText: string;
  confidence: number;
  documentType: OCRTargetDocumentType;
  blocks: OCRBlock[];
  detectedLanguage?: string;
  metadata?: Record<string, string | number | boolean>;
}

export type OCRAdapterFunction = (
  imageUri: string,
  options: OCRProcessingOptions
) => Promise<OCRResult>;

/**
 * Universal, Modular OCR Engine Service.
 * A shared system utility usable across any domain feature (Accounts receipt scanning,
 * Professor study card extraction, Project Manager whiteboard capture, Custom Agents).
 * Features can configure custom preprocessing, target document types, confidence thresholds,
 * and custom parsing adapters.
 */
export class OCREngineService {
  private static instance: OCREngineService | null = null;
  private customAdapter: OCRAdapterFunction | null = null;

  private constructor() {
    this.registerBusHandlers();
  }

  static getInstance(): OCREngineService {
    if (!OCREngineService.instance) {
      OCREngineService.instance = new OCREngineService();
    }
    return OCREngineService.instance;
  }

  /**
   * Registers universal OCR capability on the central Agent Bus.
   * Any agent or feature can call this over the bus with their tailored parameters.
   */
  private registerBusHandlers(): void {
    agentBus.registerQueryHandler<
      { imageUri: string; options?: OCRProcessingOptions },
      OCRResult
    >('ocr_engine', 'process_image', async (query) => {
      return this.processImage(query.payload.imageUri, query.payload.options);
    });
  }

  /**
   * Allows plugging in an external or native OCR backend (e.g. Google ML Kit, Tesseract, ONNX).
   */
  setAdapter(adapter: OCRAdapterFunction): void {
    this.customAdapter = adapter;
  }

  resetAdapter(): void {
    this.customAdapter = null;
  }

  /**
   * Core execution pipeline:
   * 1. Validates image inputs and processing options.
   * 2. Executes either native/custom adapter or fallback heuristic parsing.
   * 3. Applies post-processing thresholds and structured block classification.
   */
  async processImage(
    imageUri: string,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult> {
    if (!imageUri || !imageUri.trim()) {
      throw new Error('Image URI cannot be empty');
    }

    const docType = options.documentType || 'general';
    const threshold = options.confidenceThreshold ?? 0.6;

    if (threshold < 0 || threshold > 1.0) {
      throw new Error('Confidence threshold must be between 0.0 and 1.0');
    }

    // 1. If custom/native adapter is configured, use it
    if (this.customAdapter) {
      const adapterResult = await this.customAdapter(imageUri, options);
      // Filter out low confidence blocks if applicable
      const filteredBlocks = adapterResult.blocks.filter(
        (b) => b.confidence >= threshold
      );
      return {
        ...adapterResult,
        blocks: filteredBlocks,
      };
    }

    // 2. Default built-in mock/fallback parser for local test environments
    return this.defaultLocalProcessing(imageUri, options);
  }

  /**
   * Universal text block classifier for different document types.
   */
  classifyTextBlocks(
    rawText: string,
    docType: OCRTargetDocumentType
  ): OCRBlock[] {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const blocks: OCRBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0) {
        blocks.push({
          blockType: 'header',
          text: line,
          confidence: 0.95,
        });
        continue;
      }

      if (docType === 'receipt' || docType === 'invoice') {
        if (/total|amount|subtotal|balance/i.test(line)) {
          blocks.push({
            blockType: 'total',
            text: line,
            confidence: 0.92,
          });
        } else if (/[0-9]+[.,][0-9]{2}/.test(line)) {
          blocks.push({
            blockType: 'line_item',
            text: line,
            confidence: 0.88,
          });
        } else {
          blocks.push({
            blockType: 'paragraph',
            text: line,
            confidence: 0.85,
          });
        }
      } else {
        blocks.push({
          blockType: 'paragraph',
          text: line,
          confidence: 0.9,
        });
      }
    }

    return blocks;
  }

  private defaultLocalProcessing(
    imageUri: string,
    options: OCRProcessingOptions
  ): OCRResult {
    const docType = options.documentType || 'general';
    const mockContent = `Document from ${imageUri}\nHeader Title\nSample Line 1: 19.99\nTotal: 19.99`;
    const blocks = this.classifyTextBlocks(mockContent, docType);

    return {
      fullText: mockContent,
      confidence: 0.9,
      documentType: docType,
      blocks,
      detectedLanguage: options.detectLanguage || 'en',
    };
  }
}

export const ocrEngine = OCREngineService.getInstance();
