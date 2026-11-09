import { butlerAgent } from '../../src/agents/ButlerAgentService';
import { projectManagerAgent } from '../../src/agents/ProjectManagerService';
import { accountsAgent } from '../../src/agents/AccountsService';
import { healthAgent } from '../../src/agents/HealthService';
import { professorAgent } from '../../src/agents/ProfessorService';
import { chefAgent } from '../../src/agents/ChefService';
import { agentBus } from '../../src/kernel/AgentBusService';
import { ocrEngine } from '../../src/services/OCREngineService';
import { cameraScanner } from '../../src/services/CameraScannerService';
import { hardwareProfiler } from '../../src/services/HardwareProfilerService';

describe('Task 4.3: End-to-End Multi-Agent Integration & Lifecycle Verification', () => {
  beforeEach(() => {
    butlerAgent.clearAll();
    projectManagerAgent.clearAll();
    accountsAgent.clearAll();
    healthAgent.clearAll();
    professorAgent.clearAll();
    chefAgent.clearAll();
    cameraScanner.clearSessions();
    ocrEngine.resetAdapter();
  });

  describe('Scenario 1: Daily Briefing with Consolidated Cross-Agent State', () => {
    it('aggregates calendar, reminders, step vitals, and scheduled dinner into Butler briefing', async () => {
      // 1. Butler schedules morning standup
      const now = Date.now();
      butlerAgent.addCalendarEvent('Team Standup', now + 1800000, now + 3600000, 'meeting');
      butlerAgent.addReminder('Submit weekly timesheet', now + 7200000, 'normal');

      // 2. Health Agent logs morning steps and hydration
      healthAgent.recordSteps(4250);
      healthAgent.logHydration(750);

      // 3. Chef Agent plans tonight dinner
      const recipe = chefAgent.createRecipe('Grilled Salmon & Asparagus', '', 15, 20, 2, [
        { name: 'Salmon', amount: '2 fillets' },
      ], []);
      chefAgent.scheduleMeal(recipe.id, 'dinner');

      // 4. Generate daily briefing
      const briefing = await butlerAgent.generateDailyBriefing();

      expect(briefing).toContain('1 event(s) scheduled');
      expect(briefing).toContain('1 pending reminder(s)');
      expect(briefing).toContain('Daily step count stands at 4250 steps.');
      expect(briefing).toContain("Tonight's scheduled dinner is Grilled Salmon & Asparagus.");
    });
  });

  describe('Scenario 2: Project Management to Calendar Blocking Workflow', () => {
    it('captures idea, converts to project, adds tasks, and blocks milestone focus on Butler calendar', async () => {
      // 1. Capture idea on PM backlog
      const idea = projectManagerAgent.captureIdea(
        'Zero-Knowledge Sync Engine',
        'Offline p2p sync over encrypted BLE',
        ['p2p', 'crypto']
      );

      // 2. Convert to active project with milestones
      const targetDate = Date.now() + 86400000;
      const project = projectManagerAgent.convertIdeaToProject(
        idea.id,
        'Project ZK Sync',
        [{ title: 'Protocol Handshake RFC', targetDate, isCompleted: false }],
        'high'
      );

      // 3. Add development tasks
      const task1 = projectManagerAgent.addTask(project.id, 'Implement ChaCha20 Handshake', 'high');
      projectManagerAgent.addTask(project.id, 'Benchmarking on Nothing Phone 1', 'medium');

      projectManagerAgent.updateTaskStatus(task1.id, 'done');

      // 4. Schedule milestone focus block with Butler via Agent Bus
      const milestoneId = project.milestones[0].id;
      const scheduleRes = await projectManagerAgent.scheduleMilestoneOnCalendar(
        project.id,
        milestoneId,
        5400000 // 1.5 hours
      );

      expect(scheduleRes.scheduled).toBe(true);

      const events = butlerAgent.getUpcomingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('[Project: Project ZK Sync] Protocol Handshake RFC');
      expect(events[0].category).toBe('focus_block');

      const summary = projectManagerAgent.getProjectSummary(project.id);
      expect(summary?.progressPercentage).toBe(50);
      expect(summary?.completedTasks).toBe(1);
      expect(summary?.totalTasks).toBe(2);
    });
  });

  describe('Scenario 3: Camera Receipt Scanner to Accounts Expense & Budget', () => {
    it('captures receipt image with CameraScanner, parses with OCR, and updates Accounts summary', async () => {
      ocrEngine.setAdapter(async () => ({
        fullText: 'Bistro Central\nSteak Frites 24.50\nSparkling Water 4.50\nTOTAL $29.00',
        confidence: 0.96,
        documentType: 'receipt',
        blocks: [],
      }));

      // Trigger Camera Scanner
      const scanSession = await cameraScanner.captureAndScan(
        { quality: 0.9 },
        { documentType: 'receipt', confidenceThreshold: 0.7 }
      );

      expect(scanSession.ocrResult).toBeDefined();

      // Log expense in Accounts
      const expense = accountsAgent.logExpenseFromReceipt(
        scanSession.ocrResult!.fullText,
        'food_dining',
        scanSession.capturedImageUri
      );

      expect(expense.merchant).toBe('Bistro Central');
      expect(expense.amount).toBe(29.0);
      expect(expense.category).toBe('food_dining');

      const summary = accountsAgent.getSpendingSummary();
      expect(summary.totalSpent).toBe(29.0);
      expect(summary.categoryBreakdown.food_dining).toBe(29.0);
    });
  });

  describe('Scenario 4: Professor Study Session to Calendar & Flashcard Review', () => {
    it('creates learning roadmap, schedules study session with Butler, and tracks study streak', async () => {
      const roadmap = professorAgent.createRoadmap(
        'Machine Learning Quantization',
        'Model optimization on edge devices',
        'AI'
      );

      // Schedule study focus block with Butler
      const startTime = Date.now() + 3600000;
      const scheduleRes = await professorAgent.scheduleStudySessionWithButler(
        roadmap.title,
        startTime,
        90
      );
      expect(scheduleRes.scheduled).toBe(true);

      // Create flashcard and simulate review
      const card = professorAgent.createFlashcard(
        'What is INT8 quantization?',
        'Representing 32-bit floating point weights with 8-bit integers'
      );

      const reviewedCard = professorAgent.reviewFlashcard(card.id, 'easy');
      expect(reviewedCard.repetitionCount).toBe(1);
      expect(reviewedCard.intervalDays).toBe(1);

      // Study streak check
      expect(professorAgent.getCurrentStreakDays()).toBe(1);
    });
  });

  describe('Scenario 5: Hardware Baseline Latency & Budget Guardrails', () => {
    it('verifies full voice loop and AI memory allocation adhere to Nothing Phone 1 thresholds', () => {
      const profile = hardwareProfiler.getDeviceProfile();
      expect(profile.usableRamBudgetMb).toBe(2500);

      // Evaluate Qwen 2.5 3B execution on Snapdragon 778G+
      const modelEval = hardwareProfiler.evaluateModelPerformance(
        'Qwen-2.5-3B-Instruct',
        'q4_k_m',
        1850,
        340,
        17.2
      );
      expect(modelEval.status).toBe('optimal');

      // End-to-end voice turnaround
      const latencyReport = hardwareProfiler.measureVoiceSubsystemLatency(110, 220, 95);
      expect(latencyReport.totalEndToEndVoiceLatencyMs).toBe(425);
      expect(latencyReport.isUnderVoiceTarget).toBe(true);
    });
  });
});
