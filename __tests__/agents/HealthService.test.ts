import { HealthService, healthAgent } from '../../src/agents/HealthService';
import { ButlerAgentService, butlerAgent } from '../../src/agents/ButlerAgentService';
import { agentBus } from '../../src/kernel/AgentBusService';

describe('HealthService (Task 3.6)', () => {
  let health: HealthService;

  beforeEach(() => {
    health = HealthService.getInstance();
    health.clearAll();
    butlerAgent.clearAll();
  });

  describe('Step Counter Operations', () => {
    it('records steps incrementally for the current date', () => {
      const s1 = health.recordSteps(1500);
      expect(s1).toBe(1500);
      expect(health.getSteps()).toBe(1500);

      const s2 = health.recordSteps(2500);
      expect(s2).toBe(4000);
      expect(health.getSteps()).toBe(4000);
    });

    it('throws error when recording negative or invalid step counts', () => {
      expect(() => health.recordSteps(-50)).toThrow('Steps must be a non-negative number');
      expect(() => health.recordSteps(NaN)).toThrow('Steps must be a non-negative number');
    });
  });

  describe('Hydration Tracking', () => {
    it('logs hydration and calculates daily total', () => {
      const log1 = health.logHydration(350);
      expect(log1.id).toMatch(/^hyd_/);
      expect(log1.amountMl).toBe(350);

      health.logHydration(500);
      expect(health.getHydrationForDate()).toBe(850);
    });

    it('throws error for invalid hydration amounts', () => {
      expect(() => health.logHydration(0)).toThrow('Hydration amount must be a positive number');
      expect(() => health.logHydration(-100)).toThrow('Hydration amount must be a positive number');
    });

    it('sets and gets daily hydration goal', () => {
      expect(health.getHydrationGoal()).toBe(2500);
      health.setHydrationGoal(3000);
      expect(health.getHydrationGoal()).toBe(3000);

      expect(() => health.setHydrationGoal(0)).toThrow('Hydration goal must be greater than 0');
    });
  });

  describe('Medication Schedule & Butler Reminders', () => {
    it('adds and retrieves medications sorted by time', () => {
      health.addMedication('Evening Zinc', '50mg', '21:00', 'daily');
      health.addMedication('Morning Vitamin D', '2000IU', '08:30', 'daily');

      const meds = health.getMedications();
      expect(meds).toHaveLength(2);
      expect(meds[0].name).toBe('Morning Vitamin D');
      expect(meds[1].name).toBe('Evening Zinc');
    });

    it('throws error for invalid medication parameters', () => {
      expect(() => health.addMedication('', '10mg', '08:00')).toThrow(
        'Medication name cannot be empty'
      );
      expect(() => health.addMedication('Aspirin', '', '08:00')).toThrow('Dosage cannot be empty');
      expect(() => health.addMedication('Aspirin', '100mg', '8am')).toThrow(
        'Time of day must be in HH:MM format'
      );
    });

    it('marks medication taken with timestamp', () => {
      const med = health.addMedication('Omega 3', '1000mg', '12:00');
      const now = Date.now();
      const updated = health.markMedicationTaken(med.id, now);

      expect(updated.lastTakenTimestamp).toBe(now);
    });

    it('throws error marking non-existent medication taken', () => {
      expect(() => health.markMedicationTaken('fake_med')).toThrow('Medication fake_med not found');
    });

    it('deletes medication', () => {
      const med = health.addMedication('Magnesium', '200mg', '22:00');
      expect(health.deleteMedication(med.id)).toBe(true);
      expect(health.deleteMedication('fake_id')).toBe(false);
      expect(health.getMedications()).toHaveLength(0);
    });

    it('schedules medication reminder with Butler over Agent Bus', async () => {
      const med = health.addMedication('Iron', '65mg', '09:00');
      const res = await health.scheduleMedicationReminderWithButler(med.id);

      expect(res.scheduled).toBe(true);
      expect(res.reminderId).toBeDefined();

      const reminders = butlerAgent.getReminders(true);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].text).toContain('Iron (65mg)');
      expect(reminders[0].priority).toBe('urgent');
    });

    it('throws error scheduling reminder for non-existent medication', async () => {
      await expect(health.scheduleMedicationReminderWithButler('fake_med')).rejects.toThrow(
        'Medication fake_med not found'
      );
    });
  });

  describe('Workout Logging', () => {
    it('logs workout sessions and retrieves for current date', () => {
      const w1 = health.logWorkout('Morning Jog', 'cardio', 30, 240);
      expect(w1.id).toMatch(/^wkt_/);
      expect(w1.durationMinutes).toBe(30);
      expect(w1.caloriesBurned).toBe(240);

      const workouts = health.getWorkouts();
      expect(workouts).toHaveLength(1);
      expect(workouts[0].title).toBe('Morning Jog');
    });

    it('throws error for invalid workout inputs', () => {
      expect(() => health.logWorkout('', 'cardio', 30)).toThrow('Workout title cannot be empty');
      expect(() => health.logWorkout('Run', 'cardio', -5)).toThrow(
        'Duration minutes must be positive'
      );
    });

    it('deletes a workout session', () => {
      const w = health.logWorkout('Yoga', 'flexibility', 20);
      expect(health.deleteWorkout(w.id)).toBe(true);
      expect(health.deleteWorkout('unknown')).toBe(false);
      expect(health.getWorkouts()).toHaveLength(0);
    });
  });

  describe('Daily Vitals Consolidation & Agent Bus Integration', () => {
    it('consolidates all health metrics into DailyHealthVitals', () => {
      health.recordSteps(8500);
      health.logHydration(1800);
      health.logWorkout('HIIT Class', 'hiit', 45, 400);

      const med1 = health.addMedication('Vitamin C', '500mg', '08:00');
      health.addMedication('Melatonin', '3mg', '23:00');
      health.markMedicationTaken(med1.id);

      const vitals = health.getDailyVitals();
      expect(vitals.steps).toBe(8500);
      expect(vitals.hydrationMl).toBe(1800);
      expect(vitals.hydrationGoalMl).toBe(2500);
      expect(vitals.workouts).toHaveLength(1);
      expect(vitals.medicationsTakenCount).toBe(1);
      expect(vitals.medicationsTotalCount).toBe(2);
    });

    it('answers get_vitals_summary query requested by Butler for daily briefing', async () => {
      health.recordSteps(6200);
      health.logHydration(2000);

      const res = await agentBus.askAgent<
        { date?: number },
        { stepsToday: number; hydrationMl: number; hydrationGoalMl: number }
      >('butler', 'health', 'get_vitals_summary', { date: Date.now() });

      expect(res.success).toBe(true);
      expect(res.data?.stepsToday).toBe(6200);
      expect(res.data?.hydrationMl).toBe(2000);

      // Verify Butler incorporates this into the briefing
      const briefing = await butlerAgent.generateDailyBriefing();
      expect(briefing).toContain('Daily step count stands at 6200 steps.');
    });

    it('handles log_hydration query over Agent Bus', async () => {
      const res = await agentBus.askAgent<{ amountMl: number }, { amountMl: number }>(
        'butler',
        'health',
        'log_hydration',
        { amountMl: 400 }
      );

      expect(res.success).toBe(true);
      expect(res.data?.amountMl).toBe(400);
      expect(health.getHydrationForDate()).toBe(400);
    });

    it('handles list_medications query over Agent Bus', async () => {
      health.addMedication('CoQ10', '100mg', '10:00');

      const res = await agentBus.askAgent<Record<string, unknown>, Array<{ name: string }>>(
        'butler',
        'health',
        'list_medications',
        {}
      );

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data![0].name).toBe('CoQ10');
    });
  });
});
