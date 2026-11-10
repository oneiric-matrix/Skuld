import { agentBus } from '../kernel/AgentBusService';

export interface HydrationLog {
  id: string;
  amountMl: number;
  timestamp: number;
}

export interface MedicationSchedule {
  id: string;
  name: string;
  dosage: string; // e.g. "10mg", "1 tablet"
  timeOfDay: string; // "08:00", "20:00"
  frequency: 'daily' | 'twice_daily' | 'weekly' | 'as_needed';
  notes?: string;
  lastTakenTimestamp?: number;
  createdAt: number;
}

export interface WorkoutSession {
  id: string;
  exerciseType: 'cardio' | 'strength' | 'flexibility' | 'hiit' | 'recovery';
  title: string;
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
  timestamp: number;
}

export interface DailyHealthVitals {
  dateString: string; // "YYYY-MM-DD"
  steps: number;
  hydrationMl: number;
  hydrationGoalMl: number;
  workouts: WorkoutSession[];
  medicationsTakenCount: number;
  medicationsTotalCount: number;
}

/**
 * Health & Doctor Domain Service.
 * Manages daily step counter metrics, hydration logs, medication schedules & reminders,
 * and workout tracking. Integrates with Butler to enrich daily morning/evening briefings.
 */
export class HealthService {
  private static instance: HealthService | null = null;
  private hydrationLogs = new Map<string, HydrationLog>();
  private medications = new Map<string, MedicationSchedule>();
  private workouts = new Map<string, WorkoutSession>();
  private dailySteps = new Map<string, number>(); // key: "YYYY-MM-DD"
  private dailyHydrationGoalMl = 2500;

  private constructor() {
    this.registerBusHandlers();
  }

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  private getDateKey(timestamp = Date.now()): string {
    const d = new Date(timestamp);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  /**
   * Registers Health query & action handlers onto the central Agent Bus.
   */
  private registerBusHandlers(): void {
    // 1. Peer agents (e.g. Butler) query vitals summary for briefings
    agentBus.registerQueryHandler<{ date?: number }, { stepsToday: number; hydrationMl: number; hydrationGoalMl: number }>(
      'health',
      'get_vitals_summary',
      async (query) => {
        const dateKey = this.getDateKey(query.payload.date || Date.now());
        const vitals = this.getDailyVitals(dateKey);
        return {
          stepsToday: vitals.steps,
          hydrationMl: vitals.hydrationMl,
          hydrationGoalMl: vitals.hydrationGoalMl,
        };
      }
    );

    // 2. Peer agents can log hydration
    agentBus.registerQueryHandler<{ amountMl: number }, HydrationLog>(
      'health',
      'log_hydration',
      async (query) => {
        return this.logHydration(query.payload.amountMl);
      }
    );

    // 3. Peer agents can query active medications
    agentBus.registerQueryHandler<Record<string, unknown>, MedicationSchedule[]>(
      'health',
      'list_medications',
      async () => {
        return this.getMedications();
      }
    );
  }

  // --- Step Counter Operations ---

  recordSteps(steps: number, timestamp = Date.now()): number {
    if (typeof steps !== 'number' || isNaN(steps) || steps < 0) {
      throw new Error('Steps must be a non-negative number');
    }
    const dateKey = this.getDateKey(timestamp);
    const current = this.dailySteps.get(dateKey) || 0;
    const updated = current + steps;
    this.dailySteps.set(dateKey, updated);
    return updated;
  }

  getSteps(dateKey = this.getDateKey()): number {
    return this.dailySteps.get(dateKey) || 0;
  }

  // --- Hydration Operations ---

  logHydration(amountMl: number, timestamp = Date.now()): HydrationLog {
    if (typeof amountMl !== 'number' || isNaN(amountMl) || amountMl <= 0) {
      throw new Error('Hydration amount must be a positive number');
    }

    const log: HydrationLog = {
      id: `hyd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amountMl: Math.round(amountMl),
      timestamp,
    };

    this.hydrationLogs.set(log.id, log);
    return log;
  }

  getHydrationForDate(dateKey = this.getDateKey()): number {
    let total = 0;
    for (const log of this.hydrationLogs.values()) {
      if (this.getDateKey(log.timestamp) === dateKey) {
        total += log.amountMl;
      }
    }
    return total;
  }

  setHydrationGoal(goalMl: number): void {
    if (goalMl <= 0) {
      throw new Error('Hydration goal must be greater than 0');
    }
    this.dailyHydrationGoalMl = goalMl;
  }

  getHydrationGoal(): number {
    return this.dailyHydrationGoalMl;
  }

  // --- Medication Operations ---

  addMedication(
    name: string,
    dosage: string,
    timeOfDay: string,
    frequency: MedicationSchedule['frequency'] = 'daily',
    notes?: string
  ): MedicationSchedule {
    if (!name || !name.trim()) {
      throw new Error('Medication name cannot be empty');
    }
    if (!dosage || !dosage.trim()) {
      throw new Error('Dosage cannot be empty');
    }
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      throw new Error('Time of day must be in HH:MM format');
    }

    const med: MedicationSchedule = {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      dosage: dosage.trim(),
      timeOfDay,
      frequency,
      notes: notes?.trim(),
      createdAt: Date.now(),
    };

    this.medications.set(med.id, med);
    return med;
  }

  markMedicationTaken(id: string, timestamp = Date.now()): MedicationSchedule {
    const med = this.medications.get(id);
    if (!med) {
      throw new Error(`Medication ${id} not found`);
    }
    med.lastTakenTimestamp = timestamp;
    return med;
  }

  getMedications(): MedicationSchedule[] {
    return Array.from(this.medications.values()).sort((a, b) =>
      a.timeOfDay.localeCompare(b.timeOfDay)
    );
  }

  deleteMedication(id: string): boolean {
    return this.medications.delete(id);
  }

  /**
   * Schedules medication intake reminder with Butler over Agent Bus.
   */
  async scheduleMedicationReminderWithButler(
    medicationId: string
  ): Promise<{ scheduled: boolean; reminderId?: string }> {
    const med = this.medications.get(medicationId);
    if (!med) {
      throw new Error(`Medication ${medicationId} not found`);
    }

    const [hours, minutes] = med.timeOfDay.split(':').map(Number);
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
    }

    const response = await agentBus.askAgent<
      { text: string; remindAt: number; priority: string },
      { id: string }
    >('health', 'butler', 'create_reminder', {
      text: `Medication Reminder: Take ${med.name} (${med.dosage})`,
      remindAt: target.getTime(),
      priority: 'urgent',
    });

    if (response.success && response.data) {
      return { scheduled: true, reminderId: response.data.id };
    }
    return { scheduled: false };
  }

  // --- Workout Operations ---

  logWorkout(
    title: string,
    exerciseType: WorkoutSession['exerciseType'],
    durationMinutes: number,
    caloriesBurned?: number,
    notes?: string,
    timestamp = Date.now()
  ): WorkoutSession {
    if (!title || !title.trim()) {
      throw new Error('Workout title cannot be empty');
    }
    if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
      throw new Error('Duration minutes must be positive');
    }

    const session: WorkoutSession = {
      id: `wkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      exerciseType,
      durationMinutes: Math.round(durationMinutes),
      caloriesBurned: caloriesBurned ? Math.round(caloriesBurned) : undefined,
      notes: notes?.trim(),
      timestamp,
    };

    this.workouts.set(session.id, session);
    return session;
  }

  getWorkouts(dateKey = this.getDateKey()): WorkoutSession[] {
    return Array.from(this.workouts.values())
      .filter((w) => this.getDateKey(w.timestamp) === dateKey)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  deleteWorkout(id: string): boolean {
    return this.workouts.delete(id);
  }

  // --- Vitals Consolidation ---

  getDailyVitals(dateKey = this.getDateKey()): DailyHealthVitals {
    const steps = this.getSteps(dateKey);
    const hydrationMl = this.getHydrationForDate(dateKey);
    const workouts = this.getWorkouts(dateKey);

    const meds = this.getMedications();
    const takenMeds = meds.filter((m) => {
      if (!m.lastTakenTimestamp) return false;
      return this.getDateKey(m.lastTakenTimestamp) === dateKey;
    });

    return {
      dateString: dateKey,
      steps,
      hydrationMl,
      hydrationGoalMl: this.dailyHydrationGoalMl,
      workouts,
      medicationsTakenCount: takenMeds.length,
      medicationsTotalCount: meds.length,
    };
  }

  clearAll(): void {
    this.hydrationLogs.clear();
    this.medications.clear();
    this.workouts.clear();
    this.dailySteps.clear();
    this.dailyHydrationGoalMl = 2500;
  }
}

export const healthAgent = HealthService.getInstance();
