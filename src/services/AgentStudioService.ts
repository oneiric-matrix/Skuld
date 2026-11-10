import { AgentManifest } from '../agents/AgentManifest';
import { vaultDatabase } from '../security/VaultDatabase';

export interface AgentStudioDraft {
  id?: string;
  name: string;
  roleTitle: string;
  lore: string;
  systemPrompt: string;
  voice: AgentManifest['voice'];
  avatar: AgentManifest['avatar'];
  capabilities: AgentManifest['capabilities'];
}

export class AgentStudioService {
  private static instance: AgentStudioService | null = null;

  private constructor() {}

  static getInstance(): AgentStudioService {
    if (!AgentStudioService.instance) {
      AgentStudioService.instance = new AgentStudioService();
    }
    return AgentStudioService.instance;
  }

  /**
   * Generates a structured system prompt from persona attributes if not provided manually.
   */
  generateSystemPrompt(name: string, roleTitle: string, lore: string, capabilities: string[]): string {
    return [
      `You are ${name}, a dedicated ${roleTitle}.`,
      lore ? `Background: ${lore}` : '',
      `Your active capabilities include: ${capabilities.join(', ')}.`,
      `Always stay in character, respond concisely, and assist the user proactively.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Validates and provisions a new agent into the encrypted database.
   */
  async createOrUpdateAgent(draft: AgentStudioDraft, isCustom = true): Promise<AgentManifest> {
    if (!draft.name || draft.name.trim().length === 0) {
      throw new Error('Agent name is required');
    }
    if (!draft.roleTitle || draft.roleTitle.trim().length === 0) {
      throw new Error('Role title is required');
    }

    const id =
      draft.id ||
      (isCustom
        ? `custom_${draft.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`
        : draft.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));

    const systemPrompt =
      draft.systemPrompt && draft.systemPrompt.trim().length > 0
        ? draft.systemPrompt
        : this.generateSystemPrompt(draft.name, draft.roleTitle, draft.lore, draft.capabilities);

    const now = Date.now();
    const manifest: AgentManifest = {
      id,
      name: draft.name.trim(),
      roleTitle: draft.roleTitle.trim(),
      lore: (draft.lore || '').trim(),
      systemPrompt,
      voice: draft.voice,
      avatar: draft.avatar,
      capabilities: draft.capabilities || [],
      isCustom,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Persist to encrypted SQLite agents_config
    const db = vaultDatabase.getRawDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO agents_config (id, custom_name, role_title, voice_id, avatar_profile, is_active, system_prompt)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [
        manifest.id,
        manifest.name,
        manifest.roleTitle,
        manifest.voice.modelId,
        manifest.avatar.assetUri,
        manifest.systemPrompt,
      ]
    );

    return manifest;
  }

  /**
   * Deletes an agent from the roster.
   */
  async deleteAgent(agentId: string): Promise<void> {
    const db = vaultDatabase.getRawDb();
    await db.runAsync('DELETE FROM agents_config WHERE id = ?', [agentId]);
  }
}

export const agentStudio = AgentStudioService.getInstance();
