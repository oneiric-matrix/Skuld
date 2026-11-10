import { OCREngineService, ocrEngine } from '../../src/services/OCREngineService';
import { AccountsService, accountsAgent } from '../../src/agents/AccountsService';
import { ProfessorService, professorAgent } from '../../src/agents/ProfessorService';
import { agentBus } from '../../src/kernel/AgentBusService';

describe('Modular Sub-Feature Architecture: Universal OCREngineService', () => {
  let engine: OCREngineService;

  beforeEach(() => {
    engine = OCREngineService.getInstance();
    engine.resetAdapter();
    accountsAgent.clearAll();
    professorAgent.clearAll();
  });

  describe('Core OCR Engine & Configuration Parameters', () => {
    it('processes image with default parameters and classifies blocks', async () => {
      const res = await engine.processImage('file://sample/doc.png');

      expect(res.fullText).toContain('file://sample/doc.png');
      expect(res.confidence).toBeGreaterThanOrEqual(0.6);
      expect(res.documentType).toBe('general');
      expect(res.blocks.length).toBeGreaterThan(0);
      expect(res.blocks[0].blockType).toBe('header');
    });

    it('classifies receipt blocks correctly when documentType is receipt', async () => {
      const receiptText = 'Corner Cafe\nCoffee 4.50\nCroissant 3.00\nTotal: 7.50';
      const blocks = engine.classifyTextBlocks(receiptText, 'receipt');

      expect(blocks).toHaveLength(4);
      expect(blocks[0].blockType).toBe('header');
      expect(blocks[1].blockType).toBe('line_item');
      expect(blocks[2].blockType).toBe('line_item');
      expect(blocks[3].blockType).toBe('total');
    });

    it('throws error when image URI is empty or confidence threshold is out of bounds', async () => {
      await expect(engine.processImage('')).rejects.toThrow('Image URI cannot be empty');
      await expect(
        engine.processImage('file://img.png', { confidenceThreshold: 1.5 })
      ).rejects.toThrow('Confidence threshold must be between 0.0 and 1.0');
      await expect(
        engine.processImage('file://img.png', { confidenceThreshold: -0.1 })
      ).rejects.toThrow('Confidence threshold must be between 0.0 and 1.0');
    });

    it('supports custom adapter injection with confidence filtering', async () => {
      engine.setAdapter(async (uri, options) => ({
        fullText: 'Custom OCR Text',
        confidence: 0.98,
        documentType: options.documentType || 'general',
        blocks: [
          { blockType: 'header', text: 'Custom Header', confidence: 0.99 },
          { blockType: 'paragraph', text: 'Low Confidence Noise', confidence: 0.4 },
        ],
      }));

      const res = await engine.processImage('file://img.png', { confidenceThreshold: 0.8 });
      expect(res.fullText).toBe('Custom OCR Text');
      expect(res.blocks).toHaveLength(1); // 0.4 filtered out by 0.8 threshold
      expect(res.blocks[0].text).toBe('Custom Header');
    });

    it('answers process_image query over Agent Bus', async () => {
      const res = await agentBus.askAgent<
        { imageUri: string; options: { documentType: 'invoice' } },
        { documentType: string }
      >('accounts', 'ocr_engine', 'process_image', {
        imageUri: 'file://invoices/inv_1.png',
        options: { documentType: 'invoice' },
      });

      expect(res.success).toBe(true);
      expect(res.data?.documentType).toBe('invoice');
    });
  });

  describe('Feature Reusability with Custom Parameters across Domains', () => {
    it('Accounts feature reuses OCR engine with receipt-tailored parameters', async () => {
      // Mock custom OCR adapter outputting receipt format
      engine.setAdapter(async () => ({
        fullText: 'Supermarket Express\nMilk 3.50\nEggs 4.00\nTotal: 7.50 USD',
        confidence: 0.95,
        documentType: 'receipt',
        blocks: [],
      }));

      const expense = await accountsAgent.scanReceiptImage(
        'file://receipts/groceries.jpg',
        { confidenceThreshold: 0.7, enhanceContrast: true },
        'groceries'
      );

      expect(expense.merchant).toBe('Supermarket Express');
      expect(expense.amount).toBe(7.5);
      expect(expense.currency).toBe('USD');
      expect(expense.category).toBe('groceries');
      expect(accountsAgent.getExpenses()).toHaveLength(1);
    });

    it('Professor feature reuses same OCR engine with book/notes parameters to create flashcards', async () => {
      // Mock custom OCR adapter outputting textbook snippet
      engine.setAdapter(async (uri, opts) => {
        expect(opts.documentType).toBe('book_page');
        expect(opts.confidenceThreshold).toBe(0.6);
        return {
          fullText: 'Mitochondria is the powerhouse of the eukaryotic cell.',
          confidence: 0.92,
          documentType: 'book_page',
          blocks: [],
        };
      });

      const card = await professorAgent.createFlashcardFromImage(
        'file://textbooks/biology_page_42.jpg',
        'What is the function of mitochondria?'
      );

      expect(card.front).toBe('What is the function of mitochondria?');
      expect(card.back).toBe(
        'Mitochondria is the powerhouse of the eukaryotic cell.'
      );
      expect(card.repetitionCount).toBe(0);
      expect(professorAgent.getDueFlashcards()).toHaveLength(1);
    });

    it('throws error when creating flashcard from image with empty question or blank OCR output', async () => {
      await expect(
        professorAgent.createFlashcardFromImage('file://img.png', '')
      ).rejects.toThrow('Front question cannot be empty');

      engine.setAdapter(async () => ({
        fullText: '   ',
        confidence: 0.1,
        documentType: 'book_page',
        blocks: [],
      }));

      await expect(
        professorAgent.createFlashcardFromImage('file://img.png', 'Question?')
      ).rejects.toThrow('Could not extract valid text from study image');
    });
  });
});
