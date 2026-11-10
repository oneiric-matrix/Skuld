import { ButlerDashboardView, ButlerDashboardViewProps } from '../../src/components/dashboards/ButlerDashboardView';
import { ProjectManagerDashboardView, ProjectManagerDashboardViewProps } from '../../src/components/dashboards/ProjectManagerDashboardView';
import { AccountsDashboardView, AccountsDashboardViewProps } from '../../src/components/dashboards/AccountsDashboardView';
import { HealthDashboardView, HealthDashboardViewProps } from '../../src/components/dashboards/HealthDashboardView';
import { ProfessorDashboardView, ProfessorDashboardViewProps } from '../../src/components/dashboards/ProfessorDashboardView';
import { ChefDashboardView, ChefDashboardViewProps } from '../../src/components/dashboards/ChefDashboardView';

describe('Phase 5 Domain Dashboards Contract & UI State Tests', () => {
  describe('ButlerDashboardView', () => {
    it('renders schedule events and reminders', () => {
      const mockEvents = [
        {
          id: 'evt_1',
          title: 'Board Meeting',
          startTime: Date.now() + 3600000,
          endTime: Date.now() + 7200000,
          location: 'Valhalla Hall',
          category: 'meeting' as const,
          createdAt: Date.now(),
        },
      ];
      const mockReminders = [
        {
          id: 'rem_1',
          text: 'Send Weekly Report',
          priority: 'urgent' as const,
          remindAt: Date.now() + 1800000,
          isCompleted: false,
          createdAt: Date.now(),
        },
      ];

      const onAddEvent = jest.fn();
      const onToggleReminder = jest.fn();
      const onAddReminder = jest.fn();
      const onDeleteEvent = jest.fn();

      const props: ButlerDashboardViewProps = {
        events: mockEvents,
        reminders: mockReminders,
        onAddEvent,
        onToggleReminder,
        onAddReminder,
        onDeleteEvent,
      };

      expect(ButlerDashboardView).toBeDefined();
      expect(props.events).toHaveLength(1);
      expect(props.reminders).toHaveLength(1);

      // Trigger reminder add & toggle contract
      props.onAddReminder('Check servers', 'high');
      expect(onAddReminder).toHaveBeenCalledWith('Check servers', 'high');

      props.onToggleReminder('rem_1');
      expect(onToggleReminder).toHaveBeenCalledWith('rem_1');

      if (props.onDeleteEvent) {
        props.onDeleteEvent('evt_1');
        expect(onDeleteEvent).toHaveBeenCalledWith('evt_1');
      }
    });

    it('renders empty state without crashing', () => {
      const props: ButlerDashboardViewProps = {
        events: [],
        reminders: [],
        onAddEvent: jest.fn(),
        onToggleReminder: jest.fn(),
        onAddReminder: jest.fn(),
      };
      expect(props.events).toEqual([]);
      expect(props.reminders).toEqual([]);
    });
  });

  describe('ProjectManagerDashboardView', () => {
    it('handles kanban columns, milestone rendering, and task callbacks', () => {
      const mockProjects = [
        {
          id: 'proj_1',
          title: 'Skuld Architecture',
          description: 'Core OS Engine',
          status: 'in_progress' as const,
          priority: 'critical' as const,
          milestones: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      const mockTasks = [
        {
          id: 'task_1',
          projectId: 'proj_1',
          title: 'Design Living Avatars',
          status: 'todo' as const,
          priority: 'high' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      const mockMilestones = [
        {
          id: 'ms_1',
          title: 'Alpha Release',
          targetDate: Date.now() + 86400000,
          isCompleted: false,
        },
      ];

      const onAddTask = jest.fn();
      const onUpdateTaskStatus = jest.fn();
      const onFocusBlockRequested = jest.fn();

      const props: ProjectManagerDashboardViewProps = {
        projects: mockProjects,
        tasks: mockTasks,
        milestones: mockMilestones,
        activeProjectId: 'proj_1',
        onAddTask,
        onUpdateTaskStatus,
        onFocusBlockRequested,
      };

      expect(ProjectManagerDashboardView).toBeDefined();
      expect(props.projects).toHaveLength(1);
      expect(props.tasks).toHaveLength(1);
      expect(props.milestones).toHaveLength(1);

      props.onAddTask('proj_1', 'Implement Speech Engine', 'critical');
      expect(onAddTask).toHaveBeenCalledWith('proj_1', 'Implement Speech Engine', 'critical');

      props.onUpdateTaskStatus('task_1', 'in_progress');
      expect(onUpdateTaskStatus).toHaveBeenCalledWith('task_1', 'in_progress');

      if (props.onFocusBlockRequested) {
        props.onFocusBlockRequested('Design Living Avatars');
        expect(onFocusBlockRequested).toHaveBeenCalledWith('Design Living Avatars');
      }
    });
  });

  describe('AccountsDashboardView', () => {
    it('handles spending summaries, expense logging, and receipt scan trigger', () => {
      const mockSummary = {
        totalSpent: 1250.75,
        currency: 'USD',
        count: 14,
        categoryBreakdown: {
          food_dining: 200,
          groceries: 450,
          transportation: 120,
          utilities: 280,
          entertainment: 100,
          health_medical: 50,
          shopping: 50.75,
          education: 0,
          other: 0,
        },
        averageExpense: 89.34,
      };

      const mockExpenses = [
        {
          id: 'exp_1',
          amount: 45.5,
          currency: 'USD',
          category: 'groceries' as const,
          merchant: 'Whole Foods Market',
          isRecurring: false,
          timestamp: Date.now(),
          createdAt: Date.now(),
        },
      ];

      const mockBills = [
        {
          id: 'bill_1',
          name: 'Cloud Infrastructure VPS',
          amount: 40.0,
          currency: 'USD',
          category: 'utilities' as const,
          frequency: 'monthly' as const,
          dueDayOfMonth: 15,
          nextDueDate: Date.now() + 86400000 * 5,
          autoAlertEnabled: true,
          isPaidForCurrentCycle: false,
          createdAt: Date.now(),
        },
      ];

      const onAddExpense = jest.fn();
      const onToggleBillPaid = jest.fn();
      const onOpenReceiptScanner = jest.fn();

      const props: AccountsDashboardViewProps = {
        summary: mockSummary,
        recentExpenses: mockExpenses,
        recurringBills: mockBills,
        onAddExpense,
        onToggleBillPaid,
        onOpenReceiptScanner,
      };

      expect(AccountsDashboardView).toBeDefined();
      expect(props.summary.totalSpent).toBe(1250.75);
      expect(props.recentExpenses).toHaveLength(1);
      expect(props.recurringBills).toHaveLength(1);

      props.onAddExpense(25.0, 'food_dining', 'Coffee Roasters', 'USD');
      expect(onAddExpense).toHaveBeenCalledWith(25.0, 'food_dining', 'Coffee Roasters', 'USD');

      props.onToggleBillPaid('bill_1');
      expect(onToggleBillPaid).toHaveBeenCalledWith('bill_1');

      props.onOpenReceiptScanner();
      expect(onOpenReceiptScanner).toHaveBeenCalled();
    });
  });

  describe('HealthDashboardView', () => {
    it('manages daily steps, hydration, medication ticks, and workouts', () => {
      const mockVitals = {
        dateString: '2026-11-10',
        steps: 8420,
        hydrationMl: 2100,
        hydrationGoalMl: 2500,
        workouts: [],
        medicationsTakenCount: 1,
        medicationsTotalCount: 2,
      };

      const mockMeds = [
        {
          id: 'med_1',
          name: 'Vitamin D3',
          dosage: '5000 IU',
          timeOfDay: '09:00',
          frequency: 'daily' as const,
          lastTakenTimestamp: Date.now(),
          createdAt: Date.now(),
        },
      ];

      const mockWorkouts = [
        {
          id: 'wo_1',
          exerciseType: 'cardio' as const,
          title: 'Nordic Trail Run',
          durationMinutes: 42,
          caloriesBurned: 380,
          timestamp: Date.now(),
        },
      ];

      const onLogSteps = jest.fn();
      const onLogHydration = jest.fn();
      const onToggleMedication = jest.fn();
      const onLogWorkout = jest.fn();

      const props: HealthDashboardViewProps = {
        vitals: mockVitals,
        medications: mockMeds,
        workouts: mockWorkouts,
        onLogSteps,
        onLogHydration,
        onToggleMedication,
        onLogWorkout,
      };

      expect(HealthDashboardView).toBeDefined();
      expect(props.vitals.steps).toBe(8420);
      expect(props.medications).toHaveLength(1);

      props.onLogSteps(1000);
      expect(onLogSteps).toHaveBeenCalledWith(1000);

      props.onLogHydration(500);
      expect(onLogHydration).toHaveBeenCalledWith(500);

      props.onToggleMedication('med_1');
      expect(onToggleMedication).toHaveBeenCalledWith('med_1');

      props.onLogWorkout('strength', 'Deadlifts & Pull-ups', 45, 320);
      expect(onLogWorkout).toHaveBeenCalledWith('strength', 'Deadlifts & Pull-ups', 45, 320);
    });
  });

  describe('ProfessorDashboardView', () => {
    it('manages SM-2 flashcard ease ratings, roadmaps, and skill proficiencies', () => {
      const mockSummary = {
        activeRoadmapsCount: 2,
        acquiredSkillsCount: 5,
        dueCardsCount: 3,
        currentStreakDays: 14,
        totalStudyHours: 48,
      };

      const mockCards = [
        {
          id: 'card_1',
          front: 'What is the SM-2 minimum ease factor?',
          back: '1.3 is the standard floor.',
          intervalDays: 4,
          easeFactor: 2.5,
          repetitionCount: 3,
          nextReviewDate: Date.now(),
          createdAt: Date.now(),
        },
      ];

      const mockRoadmaps = [
        {
          id: 'rm_1',
          title: 'Embedded DSP & Edge Inference',
          description: 'Master ONNX and whisper quantization',
          category: 'Computer Science',
          topics: [
            { id: 'top_1', title: 'Whisper 4-bit Quantization', isCompleted: true, order: 1 },
            { id: 'top_2', title: 'SIMD Vectorization', isCompleted: false, order: 2 },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const mockSkills = [
        {
          id: 'sk_1',
          name: 'React Native Engine Internals',
          category: 'Software Engineering',
          proficiency: 'advanced' as const,
          hoursInvested: 65,
          achievedAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const onReviewCard = jest.fn();
      const onAdvanceTopic = jest.fn();

      const props: ProfessorDashboardViewProps = {
        summary: mockSummary,
        roadmaps: mockRoadmaps,
        skills: mockSkills,
        dueCards: mockCards,
        onReviewCard,
        onAdvanceTopic,
      };

      expect(ProfessorDashboardView).toBeDefined();
      expect(props.dueCards).toHaveLength(1);
      expect(props.roadmaps).toHaveLength(1);
      expect(props.skills).toHaveLength(1);

      props.onReviewCard('card_1', 'good');
      expect(onReviewCard).toHaveBeenCalledWith('card_1', 'good');

      if (props.onAdvanceTopic) {
        props.onAdvanceTopic('rm_1', 'top_2');
        expect(onAdvanceTopic).toHaveBeenCalledWith('rm_1', 'top_2');
      }
    });
  });

  describe('ChefDashboardView', () => {
    it('handles scheduled meals, recipe filters, and grocery checklist', () => {
      const mockMeals = [
        {
          id: 'meal_1',
          recipeId: 'rec_1',
          recipeName: 'Glacial Salmon Bowl',
          mealType: 'dinner' as const,
          scheduledDate: '2026-11-10',
          timestamp: Date.now(),
        },
      ];

      const mockRecipes = [
        {
          id: 'rec_1',
          title: 'Glacial Salmon Bowl',
          description: 'Wild salmon with roasted root vegetables and lingonberries',
          prepTimeMinutes: 15,
          cookTimeMinutes: 20,
          servings: 2,
          ingredients: [
            { name: 'Wild Salmon Fillet', amount: '400g' },
            { name: 'Lingonberries', amount: '100g' },
          ],
          steps: [
            { stepNumber: 1, instruction: 'Preheat cast iron skillet to high' },
            { stepNumber: 2, instruction: 'Sear salmon skin down for 4 mins', timerSeconds: 240 },
          ],
          dietaryTags: ['keto' as const, 'high_protein' as const],
          createdAt: Date.now(),
        },
      ];

      const mockGroceries = [
        {
          id: 'groc_1',
          name: 'Wild Salmon Fillet',
          amount: '400g',
          isChecked: false,
          recipeSource: 'Glacial Salmon Bowl',
        },
      ];

      const mockTimers = [
        {
          id: 'timer_1',
          label: 'Sear Salmon Skin',
          totalDurationSeconds: 240,
          remainingSeconds: 180,
          isRunning: true,
        },
      ];

      const onToggleGroceryItem = jest.fn();
      const onSelectRecipe = jest.fn();
      const onStartCookingTimer = jest.fn();
      const onFilterDiet = jest.fn();

      const props: ChefDashboardViewProps = {
        scheduledMeals: mockMeals,
        recipes: mockRecipes,
        groceryList: mockGroceries,
        activeTimers: mockTimers,
        onToggleGroceryItem,
        onSelectRecipe,
        onStartCookingTimer,
        onFilterDiet,
      };

      expect(ChefDashboardView).toBeDefined();
      expect(props.scheduledMeals).toHaveLength(1);
      expect(props.recipes).toHaveLength(1);
      expect(props.groceryList).toHaveLength(1);
      expect(props.activeTimers).toHaveLength(1);

      props.onToggleGroceryItem('groc_1');
      expect(onToggleGroceryItem).toHaveBeenCalledWith('groc_1');

      if (props.onStartCookingTimer) {
        props.onStartCookingTimer('Sear Salmon', 240);
        expect(onStartCookingTimer).toHaveBeenCalledWith('Sear Salmon', 240);
      }

      if (props.onFilterDiet) {
        props.onFilterDiet('keto');
        expect(onFilterDiet).toHaveBeenCalledWith('keto');
      }
    });
  });
});
