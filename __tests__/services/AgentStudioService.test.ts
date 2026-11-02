import { AgentStudioService } from '../../src/services/AgentStudioService';
import { vaultDatabase } from '../../src/security/VaultDatabase';

// Mock VaultDatabase and SQLite
jest.mock('../../src/security/VaultDatabase', () => {
  const mockRunAsync = jest.fn(async () => {});
  return {
    vaultDatabase: {
      getRawDb: jest.fn(() => ({
        runAsync: mockRunAsync,
      })),
    },
  };
});

describe('AgentStudioService', () => {
  let studio: AgentStudioService;

  beforeEach(() => {
    studio = AgentStudioService.getInstance();
    jest.clearAllMocks();
  });

  test('positive: should generate a structured system prompt from persona details', () => {
    const prompt = studio.generateSystemPrompt(
      'Socrates',
      'Philosophy Tutor',
      'Uses dialectic questions to inspire critical thought',
      ['notes_backlog', 'math_calculator']
    );

    expect(prompt).toContain('You are Socrates, a dedicated Philosophy Tutor.');
    expect(prompt).toContain('Background: Uses dialectic questions to inspire critical thought');
    expect(prompt).toContain('notes_backlog, math_calculator');
  });

  test('positive: should validate and provision a custom agent manifest successfully', async () => {
    const manifest = await studio.createOrUpdateAgent({
      name: 'Leonardo',
      roleTitle: 'Polymath Designer',
      lore: 'Curious inventor and artist',
      systemPrompt: 'Inspire Renaissance thinking.',
      voice: {
        modelId: 'en_GB-alan-medium',
        speed: 1.0,
        pitch: 1.0,
      },
      avatar: {
        type: 'sprite_viseme',
        assetUri: 'avatar_leonardo.riv',
        mouthFlapEnabled: true,
        accentColor: '#10B981',
      },
      capabilities: ['notes_backlog', 'document_ocr'],
    });

    expect(manifest.id).toBeDefined();
    expect(manifest.id).toContain('custom_leonardo');
    expect(manifest.name).toBe('Leonardo');
    expect(manifest.roleTitle).toBe('Polymath Designer');
    expect(manifest.isCustom).toBe(true);

    const db = vaultDatabase.getRawDb();
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO agents_config'),
      expect.arrayContaining(['Leonardo', 'Polymath Designer', 'en_GB-alan-medium'])
    );
  });

  test('negative: should throw an error if agent name is missing or whitespace', async () => {
    await expect(
      studio.createOrUpdateAgent({
        name: '   ',
        roleTitle: 'Architect',
        lore: '',
        systemPrompt: '',
        voice: { modelId: 'en_US-amy-medium', speed: 1.0, pitch: 1.0 },
        avatar: { type: 'sprite_viseme', assetUri: '', mouthFlapEnabled: true, accentColor: '#FFF' },
        capabilities: [],
      })
    ).rejects.toThrow('Agent name is required');
  });

  test('negative: should throw an error if role title is missing or whitespace', async () => {
    await expect(
      studio.createOrUpdateAgent({
        name: 'Athena',
        roleTitle: '',
        lore: '',
        systemPrompt: '',
        voice: { modelId: 'en_US-amy-medium', speed: 1.0, pitch: 1.0 },
        avatar: { type: 'sprite_viseme', assetUri: '', mouthFlapEnabled: true, accentColor: '#FFF' },
        capabilities: [],
      })
    ).rejects.toThrow('Role title is required');
  });

  test('positive: should execute deleteAgent without error', async () => {
    await studio.deleteAgent('custom_leonardo_123');
    const db = vaultDatabase.getRawDb();
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM agents_config WHERE id = ?', ['custom_leonardo_123']);
  });
});
