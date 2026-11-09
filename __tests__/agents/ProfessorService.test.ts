import { ProfessorService, professorAgent } from '../../src/agents/ProfessorService';
import { ButlerAgentService, butlerAgent } from '../../src/agents/ButlerAgentService';
import { agentBus } from '../../src/kernel/AgentBusService';

describe('ProfessorService (Task 3.7)', () => {
  let professor: ProfessorService;

  beforeEach(() => {
    professor = ProfessorService.getInstance();
    professor.clearAll();
    butlerAgent.clearAll();
  });

  describe('Learning Roadmaps & Topics', () => {
    it('creates a new roadmap with structured topics', () => {
      const roadmap = professor.createRoadmap(
        'Onnx Runtime Deep Dive',
        'Mastering on-device ML execution',
        'Machine Learning',
        [
          { title: 'Graph Optimizations' },
          { title: 'Quantization INT8/INT4' },
          { title: 'WebGPU & NPU Kernels' },
        ],
        Date.now() + 30 * 86400000
      );

      expect(roadmap.id).toMatch(/^rdm_/);
      expect(roadmap.title).toBe('Onnx Runtime Deep Dive');
      expect(roadmap.topics).toHaveLength(3);
      expect(roadmap.topics[0].title).toBe('Graph Optimizations');
      expect(roadmap.topics[0].isCompleted).toBe(false);
      expect(roadmap.topics[0].order).toBe(0);

      const list = professor.getRoadmaps();
      expect(list).toHaveLength(1);
    });

    it('throws error when roadmap title is empty', () => {
      expect(() => professor.createRoadmap('')).toThrow('Roadmap title cannot be empty');
      expect(() => professor.createRoadmap('   ')).toThrow('Roadmap title cannot be empty');
    });

    it('toggles completion status of a topic', () => {
      const roadmap = professor.createRoadmap('Rust Systems Programming', '', 'Systems', [
        { title: 'Borrow Checker & Lifetimes' },
      ]);
      const topicId = roadmap.topics[0].id;

      const updated = professor.toggleTopicCompletion(roadmap.id, topicId);
      expect(updated.topics[0].isCompleted).toBe(true);

      const toggledBack = professor.toggleTopicCompletion(roadmap.id, topicId);
      expect(toggledBack.topics[0].isCompleted).toBe(false);
    });

    it('throws error toggling topic in non-existent roadmap or topic', () => {
      expect(() => professor.toggleTopicCompletion('unknown_rdm', 'top_1')).toThrow(
        'Roadmap unknown_rdm not found'
      );

      const roadmap = professor.createRoadmap('Topic Test', '', 'General', []);
      expect(() => professor.toggleTopicCompletion(roadmap.id, 'top_missing')).toThrow(
        `Topic top_missing not found in roadmap ${roadmap.id}`
      );
    });

    it('retrieves single roadmap and deletes roadmap', () => {
      const roadmap = professor.createRoadmap('WebAssembly', '', 'Web');
      expect(professor.getRoadmap(roadmap.id)?.title).toBe('WebAssembly');
      expect(professor.deleteRoadmap(roadmap.id)).toBe(true);
      expect(professor.deleteRoadmap('unknown')).toBe(false);
      expect(professor.getRoadmaps()).toHaveLength(0);
    });
  });

  describe('Acquired Skills & Mastery', () => {
    it('records and updates skill proficiency with investment hours', () => {
      const skill = professor.recordSkill('TypeScript Strict Typing', 'Programming', 'beginner', 10);

      expect(skill.id).toMatch(/^skl_/);
      expect(skill.name).toBe('TypeScript Strict Typing');
      expect(skill.proficiency).toBe('beginner');
      expect(skill.hoursInvested).toBe(10);

      const updated = professor.updateSkillProficiency(skill.id, 'advanced', 15);
      expect(updated.proficiency).toBe('advanced');
      expect(updated.hoursInvested).toBe(25);
    });

    it('throws error recording skill with empty name or negative hours', () => {
      expect(() => professor.recordSkill('', 'Coding')).toThrow('Skill name cannot be empty');
      expect(() => professor.recordSkill('React Native', 'Mobile', 'beginner', -5)).toThrow(
        'Hours invested cannot be negative'
      );
    });

    it('throws error updating non-existent skill', () => {
      expect(() => professor.updateSkillProficiency('fake_skill', 'master')).toThrow(
        'Skill fake_skill not found'
      );
    });

    it('deletes a skill', () => {
      const skill = professor.recordSkill('C++ Pointer Arithmetic', 'Systems');
      expect(professor.deleteSkill(skill.id)).toBe(true);
      expect(professor.deleteSkill('fake_id')).toBe(false);
      expect(professor.getSkills()).toHaveLength(0);
    });
  });

  describe('Spaced Repetition (SM-2 Algorithm)', () => {
    it('creates flashcard and calculates due review date', () => {
      const card = professor.createFlashcard(
        'What does ACID stand for in databases?',
        'Atomicity, Consistency, Isolation, Durability'
      );

      expect(card.id).toMatch(/^crd_/);
      expect(card.easeFactor).toBe(2.5);
      expect(card.repetitionCount).toBe(0);
      expect(card.intervalDays).toBe(1);

      const due = professor.getDueFlashcards();
      expect(due).toHaveLength(1);
    });

    it('throws error creating card with empty front or back', () => {
      expect(() => professor.createFlashcard('', 'Answer')).toThrow(
        'Flashcard front cannot be empty'
      );
      expect(() => professor.createFlashcard('Question', '')).toThrow(
        'Flashcard back cannot be empty'
      );
    });

    it('updates interval and repetitions on successful reviews (good/easy)', () => {
      const card = professor.createFlashcard('Capital of France?', 'Paris');
      const now = Date.now();

      // First successful review (q=4 good) -> interval = 1
      const rev1 = professor.reviewFlashcard(card.id, 'good', now);
      expect(rev1.repetitionCount).toBe(1);
      expect(rev1.intervalDays).toBe(1);
      expect(rev1.nextReviewDate).toBe(now + 1 * 86400000);

      // Second successful review (q=5 easy) -> interval = 6
      const rev2 = professor.reviewFlashcard(card.id, 'easy', now + 86400000);
      expect(rev2.repetitionCount).toBe(2);
      expect(rev2.intervalDays).toBe(6);

      // Third review with ease factor multiplication
      const rev3 = professor.reviewFlashcard(card.id, 'good', now + 7 * 86400000);
      expect(rev3.repetitionCount).toBe(3);
      expect(rev3.intervalDays).toBeGreaterThan(6);
    });

    it('resets interval and repetition count on failed review (again)', () => {
      const card = professor.createFlashcard('Hard Concept', 'Detailed Explanation');
      professor.reviewFlashcard(card.id, 'good');
      professor.reviewFlashcard(card.id, 'good');

      // Failed recall rating: 'again' (q=0)
      const failed = professor.reviewFlashcard(card.id, 'again');
      expect(failed.repetitionCount).toBe(0);
      expect(failed.intervalDays).toBe(1);
      expect(failed.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('throws error reviewing non-existent card', () => {
      expect(() => professor.reviewFlashcard('missing_card', 'good')).toThrow(
        'Flashcard missing_card not found'
      );
    });

    it('deletes flashcard', () => {
      const card = professor.createFlashcard('Front', 'Back');
      expect(professor.deleteFlashcard(card.id)).toBe(true);
      expect(professor.deleteFlashcard('fake')).toBe(false);
    });
  });

  describe('Study Streaks & Overall Metrics', () => {
    it('calculates continuous study streaks correctly', () => {
      const now = Date.now();
      const oneDay = 86400000;

      // Activity today and yesterday -> streak = 2
      professor.recordStudyActivity(now);
      professor.recordStudyActivity(now - oneDay);
      expect(professor.getCurrentStreakDays(now)).toBe(2);

      // Activity 2 days ago -> streak = 3
      professor.recordStudyActivity(now - 2 * oneDay);
      expect(professor.getCurrentStreakDays(now)).toBe(3);
    });

    it('breaks streak when a day is missed', () => {
      const now = Date.now();
      const oneDay = 86400000;

      // Activity today and 3 days ago (missing 1 & 2 days ago) -> streak = 1
      professor.recordStudyActivity(now);
      professor.recordStudyActivity(now - 3 * oneDay);
      expect(professor.getCurrentStreakDays(now)).toBe(1);
    });

    it('returns 0 streak when no activity is logged for today or yesterday', () => {
      const now = Date.now();
      const oneDay = 86400000;

      professor.recordStudyActivity(now - 5 * oneDay);
      expect(professor.getCurrentStreakDays(now)).toBe(0);
    });

    it('provides aggregated study summary', () => {
      professor.createRoadmap('Roadmap 1');
      professor.recordSkill('Skill 1', 'General', 'beginner', 8);
      professor.recordSkill('Skill 2', 'General', 'intermediate', 12);
      professor.createFlashcard('Q', 'A');
      professor.recordStudyActivity();

      const summary = professor.getStudySummary();
      expect(summary.activeRoadmapsCount).toBe(1);
      expect(summary.acquiredSkillsCount).toBe(2);
      expect(summary.totalStudyHours).toBe(20);
      expect(summary.dueCardsCount).toBe(1);
      expect(summary.currentStreakDays).toBe(1);
    });
  });

  describe('Agent Bus Integration & Butler Collaboration', () => {
    it('answers get_study_summary query over Agent Bus', async () => {
      professor.createRoadmap('AI Engineering');
      professor.recordSkill('LLM Fine-tuning', 'AI', 'intermediate', 15);

      const res = await agentBus.askAgent<
        Record<string, unknown>,
        { activeRoadmapsCount: number; acquiredSkillsCount: number; totalStudyHours: number }
      >('butler', 'professor', 'get_study_summary', {});

      expect(res.success).toBe(true);
      expect(res.data?.activeRoadmapsCount).toBe(1);
      expect(res.data?.acquiredSkillsCount).toBe(1);
      expect(res.data?.totalStudyHours).toBe(15);
    });

    it('answers list_roadmaps and get_due_flashcards queries over Agent Bus', async () => {
      professor.createRoadmap('Mobile Architecture');
      professor.createFlashcard('Expo Router Question', 'Answer');

      const roadmapsRes = await agentBus.askAgent<Record<string, unknown>, Array<{ title: string }>>(
        'butler',
        'professor',
        'list_roadmaps',
        {}
      );
      expect(roadmapsRes.success).toBe(true);
      expect(roadmapsRes.data).toHaveLength(1);
      expect(roadmapsRes.data![0].title).toBe('Mobile Architecture');

      const cardsRes = await agentBus.askAgent<Record<string, unknown>, Array<{ front: string }>>(
        'butler',
        'professor',
        'get_due_flashcards',
        {}
      );
      expect(cardsRes.success).toBe(true);
      expect(cardsRes.data).toHaveLength(1);
      expect(cardsRes.data![0].front).toBe('Expo Router Question');
    });

    it('schedules study focus block with Butler over Agent Bus', async () => {
      const startTime = Date.now() + 3600000;
      const res = await professor.scheduleStudySessionWithButler(
        'Machine Learning Quantization',
        startTime,
        45
      );

      expect(res.scheduled).toBe(true);
      expect(res.eventId).toBeDefined();

      const events = butlerAgent.getUpcomingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('[Study Session] Machine Learning Quantization');
      expect(events[0].category).toBe('focus_block');
    });

    it('throws error scheduling study session with empty topic', async () => {
      await expect(
        professor.scheduleStudySessionWithButler('', Date.now() + 1000)
      ).rejects.toThrow('Study topic cannot be empty');
    });
  });
});
