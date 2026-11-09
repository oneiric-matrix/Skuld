import { agentBus } from '../kernel/AgentBusService';
import { ocrEngine, OCRProcessingOptions } from '../services/OCREngineService';

export type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'master';
export type FlashcardEase = 'again' | 'hard' | 'good' | 'easy';

export interface LearningTopic {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  order: number;
}

export interface LearningRoadmap {
  id: string;
  title: string;
  description: string;
  category: string;
  topics: LearningTopic[];
  targetCompletionDate?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AcquiredSkill {
  id: string;
  name: string;
  category: string;
  proficiency: SkillProficiency;
  roadmapId?: string;
  hoursInvested: number;
  achievedAt: number;
  updatedAt: number;
}

export interface SpacedRepetitionCard {
  id: string;
  roadmapId?: string;
  front: string; // Question or prompt
  back: string; // Answer or explanation
  intervalDays: number; // SM-2 interval
  easeFactor: number; // SM-2 ease factor (default 2.5)
  repetitionCount: number;
  nextReviewDate: number; // Timestamp
  createdAt: number;
}

export interface StudySummary {
  activeRoadmapsCount: number;
  acquiredSkillsCount: number;
  dueCardsCount: number;
  currentStreakDays: number;
  totalStudyHours: number;
}

/**
 * Professor & Learning Domain Service.
 * Manages structured learning roadmaps, skill trees/mastery tracking,
 * SM-2 algorithm-based spaced repetition flashcards, and study streaks.
 * Collaborates with Butler via AgentBus to schedule study focus blocks.
 */
export class ProfessorService {
  private static instance: ProfessorService | null = null;
  private roadmaps = new Map<string, LearningRoadmap>();
  private skills = new Map<string, AcquiredSkill>();
  private flashcards = new Map<string, SpacedRepetitionCard>();
  private studyHistory = new Set<string>(); // Set of "YYYY-MM-DD" dates

  private constructor() {
    this.registerBusHandlers();
  }

  static getInstance(): ProfessorService {
    if (!ProfessorService.instance) {
      ProfessorService.instance = new ProfessorService();
    }
    return ProfessorService.instance;
  }

  private getDateKey(timestamp = Date.now()): string {
    const d = new Date(timestamp);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  /**
   * Registers Professor query & action handlers onto the central Agent Bus.
   */
  private registerBusHandlers(): void {
    // 1. Peer agents can query study summary metrics
    agentBus.registerQueryHandler<Record<string, unknown>, StudySummary>(
      'professor',
      'get_study_summary',
      async () => {
        return this.getStudySummary();
      }
    );

    // 2. Peer agents can query active roadmaps
    agentBus.registerQueryHandler<Record<string, unknown>, LearningRoadmap[]>(
      'professor',
      'list_roadmaps',
      async () => {
        return this.getRoadmaps();
      }
    );

    // 3. Peer agents can query flashcards due for review
    agentBus.registerQueryHandler<Record<string, unknown>, SpacedRepetitionCard[]>(
      'professor',
      'get_due_flashcards',
      async () => {
        return this.getDueFlashcards();
      }
    );
  }

  // --- Learning Roadmaps Operations ---

  createRoadmap(
    title: string,
    description = '',
    category = 'General',
    topics: { title: string; description?: string }[] = [],
    targetCompletionDate?: number
  ): LearningRoadmap {
    if (!title || !title.trim()) {
      throw new Error('Roadmap title cannot be empty');
    }

    const now = Date.now();
    const formattedTopics: LearningTopic[] = topics.map((t, idx) => ({
      id: `top_${now}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      title: t.title.trim(),
      description: t.description?.trim(),
      isCompleted: false,
      order: idx,
    }));

    const roadmap: LearningRoadmap = {
      id: `rdm_${now}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      topics: formattedTopics,
      targetCompletionDate,
      createdAt: now,
      updatedAt: now,
    };

    this.roadmaps.set(roadmap.id, roadmap);
    return roadmap;
  }

  getRoadmaps(): LearningRoadmap[] {
    return Array.from(this.roadmaps.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getRoadmap(id: string): LearningRoadmap | undefined {
    return this.roadmaps.get(id);
  }

  toggleTopicCompletion(roadmapId: string, topicId: string): LearningRoadmap {
    const roadmap = this.roadmaps.get(roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found`);
    }

    const topic = roadmap.topics.find((t) => t.id === topicId);
    if (!topic) {
      throw new Error(`Topic ${topicId} not found in roadmap ${roadmapId}`);
    }

    topic.isCompleted = !topic.isCompleted;
    roadmap.updatedAt = Date.now();
    return roadmap;
  }

  deleteRoadmap(id: string): boolean {
    return this.roadmaps.delete(id);
  }

  // --- Acquired Skills & Mastery Operations ---

  recordSkill(
    name: string,
    category: string,
    proficiency: SkillProficiency = 'beginner',
    hoursInvested = 0,
    roadmapId?: string
  ): AcquiredSkill {
    if (!name || !name.trim()) {
      throw new Error('Skill name cannot be empty');
    }
    if (hoursInvested < 0) {
      throw new Error('Hours invested cannot be negative');
    }

    const now = Date.now();
    const skill: AcquiredSkill = {
      id: `skl_${now}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      category: category.trim(),
      proficiency,
      hoursInvested,
      roadmapId,
      achievedAt: now,
      updatedAt: now,
    };

    this.skills.set(skill.id, skill);
    return skill;
  }

  updateSkillProficiency(id: string, proficiency: SkillProficiency, additionalHours = 0): AcquiredSkill {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`Skill ${id} not found`);
    }

    skill.proficiency = proficiency;
    if (additionalHours > 0) {
      skill.hoursInvested += additionalHours;
    }
    skill.updatedAt = Date.now();
    return skill;
  }

  getSkills(): AcquiredSkill[] {
    return Array.from(this.skills.values()).sort((a, b) => b.hoursInvested - a.hoursInvested);
  }

  deleteSkill(id: string): boolean {
    return this.skills.delete(id);
  }

  // --- Spaced Repetition (SM-2 Algorithm) ---

  createFlashcard(front: string, back: string, roadmapId?: string): SpacedRepetitionCard {
    if (!front || !front.trim()) {
      throw new Error('Flashcard front cannot be empty');
    }
    if (!back || !back.trim()) {
      throw new Error('Flashcard back cannot be empty');
    }

    const now = Date.now();
    const card: SpacedRepetitionCard = {
      id: `crd_${now}_${Math.random().toString(36).substring(2, 7)}`,
      roadmapId,
      front: front.trim(),
      back: back.trim(),
      intervalDays: 1,
      easeFactor: 2.5,
      repetitionCount: 0,
      nextReviewDate: now, // immediately available for first study
      createdAt: now,
    };

    this.flashcards.set(card.id, card);
    return card;
  }

  getDueFlashcards(timestamp = Date.now()): SpacedRepetitionCard[] {
    return Array.from(this.flashcards.values())
      .filter((c) => c.nextReviewDate <= timestamp)
      .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
  }

  /**
   * Reviews a flashcard updating its interval and ease according to the SM-2 spaced repetition algorithm.
   */
  reviewFlashcard(cardId: string, rating: FlashcardEase, reviewTimestamp = Date.now()): SpacedRepetitionCard {
    const card = this.flashcards.get(cardId);
    if (!card) {
      throw new Error(`Flashcard ${cardId} not found`);
    }

    // Map rating to SM-2 quality grade (0 - 5)
    // again: 0, hard: 3, good: 4, easy: 5
    let quality = 4;
    switch (rating) {
      case 'again':
        quality = 0;
        break;
      case 'hard':
        quality = 3;
        break;
      case 'good':
        quality = 4;
        break;
      case 'easy':
        quality = 5;
        break;
    }

    if (quality < 3) {
      // Failed recall: reset repetitions and interval back to 1 day
      card.repetitionCount = 0;
      card.intervalDays = 1;
    } else {
      // Successful recall
      if (card.repetitionCount === 0) {
        card.intervalDays = 1;
      } else if (card.repetitionCount === 1) {
        card.intervalDays = 6;
      } else {
        card.intervalDays = Math.round(card.intervalDays * card.easeFactor);
      }
      card.repetitionCount += 1;
    }

    // Update Ease Factor (EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
    const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    card.easeFactor = Math.max(1.3, Math.round((card.easeFactor + efDelta) * 100) / 100);

    card.nextReviewDate = reviewTimestamp + card.intervalDays * 86400000;

    // Record study activity to streak
    this.recordStudyActivity(reviewTimestamp);

    return card;
  }

  deleteFlashcard(id: string): boolean {
    return this.flashcards.delete(id);
  }

  /**
   * Generates a flashcard by running OCR on textbook pages or handwritten study notes
   * with book/document-tailored OCR parameters.
   */
  async createFlashcardFromImage(
    imageUri: string,
    frontQuestion: string,
    options: Partial<OCRProcessingOptions> = {},
    roadmapId?: string
  ): Promise<SpacedRepetitionCard> {
    if (!frontQuestion || !frontQuestion.trim()) {
      throw new Error('Front question cannot be empty');
    }

    const ocrResult = await ocrEngine.processImage(imageUri, {
      documentType: 'book_page',
      confidenceThreshold: 0.6,
      enhanceContrast: true,
      detectLanguage: 'en',
      ...options,
    });

    const backText = ocrResult.fullText.trim();
    if (!backText) {
      throw new Error('Could not extract valid text from study image');
    }

    return this.createFlashcard(frontQuestion.trim(), backText, roadmapId);
  }

  // --- Study Streaks & Metrics ---

  recordStudyActivity(timestamp = Date.now()): void {
    this.studyHistory.add(this.getDateKey(timestamp));
  }

  getCurrentStreakDays(currentTimestamp = Date.now()): number {
    let streak = 0;
    const checkDate = new Date(currentTimestamp);

    // If today has activity, count it; otherwise check if yesterday was active
    const todayKey = this.getDateKey(checkDate.getTime());
    if (this.studyHistory.has(todayKey)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Today not logged yet, check yesterday
      const yesterday = new Date(checkDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = this.getDateKey(yesterday.getTime());
      if (this.studyHistory.has(yesterdayKey)) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        return 0; // Streak broken
      }
    }

    // Count backwards continuous days
    while (this.studyHistory.has(this.getDateKey(checkDate.getTime()))) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  getStudySummary(): StudySummary {
    const totalHours = Array.from(this.skills.values()).reduce(
      (sum, s) => sum + s.hoursInvested,
      0
    );

    return {
      activeRoadmapsCount: this.roadmaps.size,
      acquiredSkillsCount: this.skills.size,
      dueCardsCount: this.getDueFlashcards().length,
      currentStreakDays: this.getCurrentStreakDays(),
      totalStudyHours: totalHours,
    };
  }

  // --- Cross-Agent Collaboration ---

  /**
   * Schedules a dedicated study focus session with Butler over the central Agent Bus.
   */
  async scheduleStudySessionWithButler(
    topicOrRoadmapTitle: string,
    startTime: number,
    durationMinutes = 60
  ): Promise<{ scheduled: boolean; eventId?: string }> {
    if (!topicOrRoadmapTitle || !topicOrRoadmapTitle.trim()) {
      throw new Error('Study topic cannot be empty');
    }

    const endTime = startTime + durationMinutes * 60000;

    const response = await agentBus.askAgent<
      { title: string; startTime: number; endTime: number; category: string },
      { id: string }
    >('professor', 'butler', 'schedule_event', {
      title: `[Study Session] ${topicOrRoadmapTitle.trim()}`,
      startTime,
      endTime,
      category: 'focus_block',
    });

    if (response.success && response.data) {
      return { scheduled: true, eventId: response.data.id };
    }
    return { scheduled: false };
  }

  clearAll(): void {
    this.roadmaps.clear();
    this.skills.clear();
    this.flashcards.clear();
    this.studyHistory.clear();
  }
}

export const professorAgent = ProfessorService.getInstance();
