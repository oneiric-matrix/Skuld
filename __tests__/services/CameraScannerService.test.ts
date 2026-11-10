import { CameraScannerService, cameraScanner } from '../../src/services/CameraScannerService';
import { ocrEngine } from '../../src/services/OCREngineService';
import { agentBus } from '../../src/kernel/AgentBusService';

describe('CameraScannerService (Task 4.1)', () => {
  let scanner: CameraScannerService;

  beforeEach(() => {
    scanner = CameraScannerService.getInstance();
    scanner.resetCameraDriver();
    scanner.clearSessions();
    ocrEngine.resetAdapter();
  });

  describe('Document Scanning from Existing Image URI', () => {
    it('scans image URI and generates session with processing duration', async () => {
      const session = await scanner.scanExistingImage('file:///storage/docs/sample.jpg', {
        documentType: 'receipt',
      });

      expect(session.sessionId).toMatch(/^scan_/);
      expect(session.capturedImageUri).toBe('file:///storage/docs/sample.jpg');
      expect(session.ocrResult).toBeDefined();
      expect(session.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(scanner.getRecentSessions()).toHaveLength(1);
    });

    it('throws error when image URI is empty or missing', async () => {
      await expect(scanner.scanExistingImage('')).rejects.toThrow(
        'Image URI is required for document scan'
      );
      await expect(scanner.scanExistingImage('   ')).rejects.toThrow(
        'Image URI is required for document scan'
      );
    });
  });

  describe('Hardware Camera Driver & Shutter Pipeline', () => {
    it('executes native camera driver when configured', async () => {
      const mockDriver = jest.fn().mockResolvedValue({
        uri: 'file:///data/camera/photo_123.jpg',
      });

      scanner.setCameraDriver(mockDriver);

      const session = await scanner.captureAndScan(
        { quality: 0.95, flashMode: 'auto' },
        { documentType: 'invoice' }
      );

      expect(mockDriver).toHaveBeenCalledWith({ quality: 0.95, flashMode: 'auto' });
      expect(session.capturedImageUri).toBe('file:///data/camera/photo_123.jpg');
      expect(session.ocrResult?.documentType).toBe('invoice');
    });

    it('falls back to default simulated capture frame when no native driver is injected', async () => {
      const session = await scanner.captureAndScan();

      expect(session.capturedImageUri).toContain('/capture_');
      expect(session.ocrResult).toBeDefined();
      expect(scanner.getRecentSessions()).toHaveLength(1);
    });

    it('throws error when camera quality parameter is out of bounds', async () => {
      await expect(scanner.captureAndScan({ quality: 0 })).rejects.toThrow(
        'Camera quality must be between 0.1 and 1.0'
      );
      await expect(scanner.captureAndScan({ quality: 1.5 })).rejects.toThrow(
        'Camera quality must be between 0.1 and 1.0'
      );
    });

    it('caps recent sessions list to maximum history', async () => {
      for (let i = 0; i < 25; i++) {
        await scanner.scanExistingImage(`file:///img_${i}.jpg`);
      }
      expect(scanner.getRecentSessions()).toHaveLength(20);
    });
  });

  describe('Agent Bus Integration & Peer Invocations', () => {
    it('handles scan_document_uri query from peer agents', async () => {
      const res = await agentBus.askAgent<
        { imageUri: string; ocrOptions: { documentType: 'id_card' } },
        { sessionId: string; capturedImageUri: string }
      >('accounts', 'scanner', 'scan_document_uri', {
        imageUri: 'file:///tmp/id_card.png',
        ocrOptions: { documentType: 'id_card' },
      });

      expect(res.success).toBe(true);
      expect(res.data?.sessionId).toBeDefined();
      expect(res.data?.capturedImageUri).toBe('file:///tmp/id_card.png');
    });

    it('handles capture_and_scan query from peer agents', async () => {
      const res = await agentBus.askAgent<
        { cameraConfig: { quality: number }; ocrOptions: { documentType: 'receipt' } },
        { sessionId: string; ocrResult: { documentType: string } }
      >('accounts', 'scanner', 'capture_and_scan', {
        cameraConfig: { quality: 0.8 },
        ocrOptions: { documentType: 'receipt' },
      });

      expect(res.success).toBe(true);
      expect(res.data?.ocrResult.documentType).toBe('receipt');
    });
  });
});
