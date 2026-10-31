import * as SQLite from 'expo-sqlite';
import { hardwareVault } from './HardwareVault';
import { SkuldEnvelopeCodec, EncryptedEnvelope } from './SkuldEnvelope';

export interface PersonalMemory {
  id: string;
  agentId: string;
  category: 'preference' | 'medical_note' | 'financial_rule' | 'habit' | 'project_context';
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface AgentConfigRecord {
  id: string;
  customName: string;
  roleTitle: string;
  voiceId: string;
  avatarProfile: string;
  isActive: boolean;
  systemPrompt: string;
}

export class VaultDatabase {
  private static instance: VaultDatabase | null = null;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): VaultDatabase {
    if (!VaultDatabase.instance) {
      VaultDatabase.instance = new VaultDatabase();
    }
    return VaultDatabase.instance;
  }

  /**
   * Initializes the database connection and provisions secure schema tables.
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await SQLite.openDatabaseAsync('skuld_vault.db');

    // Run schema migrations
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS agents_config (
        id TEXT PRIMARY KEY NOT NULL,
        custom_name TEXT NOT NULL,
        role_title TEXT NOT NULL,
        voice_id TEXT NOT NULL,
        avatar_profile TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        system_prompt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vault_encrypted_memories (
        id TEXT PRIMARY KEY NOT NULL,
        agent_id TEXT NOT NULL,
        category TEXT NOT NULL,
        envelope_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS job_queue (
        id TEXT PRIMARY KEY NOT NULL,
        agent_id TEXT NOT NULL,
        job_type TEXT NOT NULL,
        payload_envelope_json TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 3,
        status TEXT NOT NULL DEFAULT 'queued',
        error_message TEXT,
        scheduled_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_job_queue_status_prio ON job_queue(status, priority, scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_memories_agent_cat ON vault_encrypted_memories(agent_id, category);
    `);

    await this.seedDefaultAgentsIfEmpty();
  }

  /**
   * Seeds default agents if not yet configured.
   */
  private async seedDefaultAgentsIfEmpty(): Promise<void> {
    if (!this.db) return;

    const row = await this.db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM agents_config'
    );

    if (row && row.count === 0) {
      const defaults = [
        {
          id: 'butler',
          custom_name: 'Alfred',
          role_title: 'Personal Coordinator',
          voice_id: 'en_GB-alan-medium',
          avatar_profile: 'avatar_butler.riv',
          system_prompt: 'You are the Butler, the central coordinator of the user’s life and all other agents.',
        },
        {
          id: 'project_manager',
          custom_name: 'Sophia',
          role_title: 'Project & Ideas Architect',
          voice_id: 'en_US-amy-medium',
          avatar_profile: 'avatar_pm.riv',
          system_prompt: 'You are the Project Manager, turning rough ideas into structured projects and actionable tasks.',
        },
        {
          id: 'accounts',
          custom_name: 'Arthur',
          role_title: 'Financial Accountant',
          voice_id: 'en_US-danny-low',
          avatar_profile: 'avatar_accounts.riv',
          system_prompt: 'You are the Accountant, managing expenses, tracking bills, and providing prudent financial guidance.',
        },
        {
          id: 'health',
          custom_name: 'Elena',
          role_title: 'Health & Wellness Coach',
          voice_id: 'en_US-kathleen-low',
          avatar_profile: 'avatar_health.riv',
          system_prompt: 'You are the Health Doctor and Coach, tracking hydration, medications, workouts, and vitals.',
        },
        {
          id: 'professor',
          custom_name: 'Julian',
          role_title: 'Professor & Mentor',
          voice_id: 'en_GB-northern_english_male-medium',
          avatar_profile: 'avatar_professor.riv',
          system_prompt: 'You are the Professor, guiding the user’s continuous learning, skills, and intellectual growth.',
        },
        {
          id: 'chef',
          custom_name: 'Marco',
          role_title: 'Culinary Chef',
          voice_id: 'en_US-bryce-medium',
          avatar_profile: 'avatar_chef.riv',
          system_prompt: 'You are the Chef, handling weekly meal plans, recipe creations, and culinary reminders.',
        },
      ];

      for (const a of defaults) {
        await this.db.runAsync(
          `INSERT INTO agents_config (id, custom_name, role_title, voice_id, avatar_profile, is_active, system_prompt)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [a.id, a.custom_name, a.role_title, a.voice_id, a.avatar_profile, a.system_prompt]
        );
      }
    }
  }

  /**
   * Saves a confidential personal memory sealed inside a .skuld encrypted envelope.
   */
  async storeEncryptedMemory(memory: PersonalMemory): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const key = hardwareVault.getActiveKey();

    const envelope = await SkuldEnvelopeCodec.seal(memory.data, key);
    const envelopeJson = JSON.stringify(envelope);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO vault_encrypted_memories (id, agent_id, category, envelope_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [memory.id, memory.agentId, memory.category, envelopeJson, memory.createdAt, memory.updatedAt]
    );
  }

  /**
   * Retrieves and decrypts personal memories for an agent.
   */
  async getDecryptedMemories(agentId: string, category?: string): Promise<PersonalMemory[]> {
    if (!this.db) throw new Error('Database not initialized');
    const key = hardwareVault.getActiveKey();

    let query = 'SELECT * FROM vault_encrypted_memories WHERE agent_id = ?';
    const params: any[] = [agentId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    const rows = await this.db.getAllAsync<{
      id: string;
      agent_id: string;
      category: string;
      envelope_json: string;
      created_at: number;
      updated_at: number;
    }>(query, params);

    const decryptedList: PersonalMemory[] = [];
    for (const row of rows) {
      const envelope: EncryptedEnvelope = JSON.parse(row.envelope_json);
      const data = await SkuldEnvelopeCodec.unseal<Record<string, any>>(envelope, key);
      decryptedList.push({
        id: row.id,
        agentId: row.agent_id,
        category: row.category as any,
        data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    return decryptedList;
  }

  /**
   * Lists all agent configurations.
   */
  async getAgents(): Promise<AgentConfigRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<any>('SELECT * FROM agents_config ORDER BY id ASC');
    return rows.map((r) => ({
      id: r.id,
      customName: r.custom_name,
      roleTitle: r.role_title,
      voiceId: r.voice_id,
      avatarProfile: r.avatar_profile,
      isActive: r.is_active === 1,
      systemPrompt: r.system_prompt,
    }));
  }

  /**
   * Returns SQLite raw database connection.
   */
  getRawDb(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }
}

export const vaultDatabase = VaultDatabase.getInstance();
