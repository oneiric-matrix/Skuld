/**
 * Standardized Agent Manifest Definition.
 * Both built-in agents (Butler, Chef, PM, etc.) and custom user-created agents
 * share this exact specification.
 */

export type AvailableVoiceModel =
  | 'en_GB-alan-medium'
  | 'en_US-amy-medium'
  | 'en_US-danny-low'
  | 'en_US-kathleen-low'
  | 'en_GB-northern_english_male-medium'
  | 'en_US-bryce-medium'
  | 'en_US-lessac-medium';

export interface VoiceProfileConfig {
  modelId: AvailableVoiceModel;
  speed: number; // 0.5 to 2.0 (default 1.0)
  pitch: number; // 0.5 to 1.5 (default 1.0)
}

export interface AvatarRigConfig {
  type: 'rive' | 'sprite_viseme' | 'static_portrait';
  assetUri: string;
  mouthFlapEnabled: boolean;
  accentColor: string; // Hex color code for agent's theme & 1x1 widget ring
}

export type StandardAgentCapability =
  | 'calendar_events'
  | 'reminder_alarms'
  | 'notes_backlog'
  | 'expense_ledger'
  | 'step_vitals_sync'
  | 'document_ocr'
  | 'math_calculator'
  | 'web_search_bridge';

export interface AgentManifest {
  id: string; // unique slug e.g. 'butler', 'chef', 'custom_philosophy_coach'
  name: string; // User-facing name e.g. "Alfred", "Marco"
  roleTitle: string; // e.g. "Personal Coordinator", "Culinary Chef"
  lore: string; // Short backstory / tone description
  systemPrompt: string; // Core system instructions provided to LLM
  voice: VoiceProfileConfig;
  avatar: AvatarRigConfig;
  capabilities: StandardAgentCapability[];
  isCustom: boolean; // false for built-in template agents, true for user-authored
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
