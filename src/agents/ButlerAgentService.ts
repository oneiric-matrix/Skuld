import { agentBus } from '../kernel/AgentBusService';
import { vaultDatabase } from '../security/VaultDatabase';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  category: 'meeting' | 'reminder' | 'focus_block' | 'personal';
  location?: string;
  notes?: string;
  createdAt: number;
}

export interface ButlerReminder {
  id: string;
  text: string;
  remindAt: number;
  isCompleted: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: number;
}

/**
 * The Butler Agent Domain Service.
 * Acts as a peer agent providing universal calendar management, reminders, and daily briefings.
 * Interacts with other agents strictly via the central Agent Bus.
 */
export class ButlerAgentService {
  private static instance: ButlerAgentService | null = null;
  private calendarEvents = new Map<string, CalendarEvent>();
  private reminders = new Map<string, ButlerReminder>();

  private constructor() {
    this.registerBusHandlers();
  }

  static getInstance(): ButlerAgentService {
    if (!ButlerAgentService.instance) {
      ButlerAgentService.instance = new ButlerAgentService();
    }
    return ButlerAgentService.instance;
  }

  /**
   * Registers Butler's domain capabilities onto the central Agent Bus.
   */
  private registerBusHandlers(): void {
    // 1. Peer agents can query Butler for user schedule
    agentBus.registerQueryHandler<{ dateTimestamp: number }, CalendarEvent[]>(
      'butler',
      'query_schedule',
      async () => {
        return this.getUpcomingEvents();
      }
    );

    // 2. Peer agents can request Butler to schedule a calendar event
    agentBus.registerQueryHandler<
      { title: string; startTime: number; endTime: number; category?: CalendarEvent['category'] },
      CalendarEvent
    >('butler', 'schedule_event', async (query) => {
      return this.addCalendarEvent(
        query.payload.title,
        query.payload.startTime,
        query.payload.endTime,
        query.payload.category
      );
    });

    // 3. Peer agents can create universal reminders via Butler
    agentBus.registerQueryHandler<
      { text: string; remindAt: number; priority?: ButlerReminder['priority'] },
      ButlerReminder
    >('butler', 'create_reminder', async (query) => {
      return this.addReminder(
        query.payload.text,
        query.payload.remindAt,
        query.payload.priority
      );
    });
  }

  addCalendarEvent(
    title: string,
    startTime: number,
    endTime: number,
    category: CalendarEvent['category'] = 'meeting',
    location?: string,
    notes?: string
  ): CalendarEvent {
    if (!title || !title.trim()) {
      throw new Error('Event title cannot be empty');
    }
    if (endTime <= startTime) {
      throw new Error('Event end time must be after start time');
    }

    const event: CalendarEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      startTime,
      endTime,
      category,
      location,
      notes,
      createdAt: Date.now(),
    };

    this.calendarEvents.set(event.id, event);
    return event;
  }

  getUpcomingEvents(): CalendarEvent[] {
    const now = Date.now();
    return Array.from(this.calendarEvents.values())
      .filter((e) => e.endTime >= now)
      .sort((a, b) => a.startTime - b.startTime);
  }

  deleteCalendarEvent(id: string): boolean {
    return this.calendarEvents.delete(id);
  }

  addReminder(
    text: string,
    remindAt: number,
    priority: ButlerReminder['priority'] = 'normal'
  ): ButlerReminder {
    if (!text || !text.trim()) {
      throw new Error('Reminder text cannot be empty');
    }

    const reminder: ButlerReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: text.trim(),
      remindAt,
      isCompleted: false,
      priority,
      createdAt: Date.now(),
    };

    this.reminders.set(reminder.id, reminder);
    return reminder;
  }

  toggleReminder(id: string): ButlerReminder {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      throw new Error(`Reminder ${id} not found`);
    }
    reminder.isCompleted = !reminder.isCompleted;
    return reminder;
  }

  getReminders(includeCompleted = false): ButlerReminder[] {
    const list = Array.from(this.reminders.values());
    return (includeCompleted ? list : list.filter((r) => !r.isCompleted)).sort(
      (a, b) => a.remindAt - b.remindAt
    );
  }

  deleteReminder(id: string): boolean {
    return this.reminders.delete(id);
  }

  /**
   * Generates a consolidated morning/evening briefing by querying peer agents over the Agent Bus.
   */
  async generateDailyBriefing(): Promise<string> {
    const events = this.getUpcomingEvents();
    const pendingReminders = this.getReminders(false);

    let briefing = `Good day! You have ${events.length} event(s) scheduled and ${pendingReminders.length} pending reminder(s).`;

    // Query Doctor/Health peer agent via bus
    const healthSummary = await agentBus.askAgent<{ date: number }, { stepsToday: number }>(
      'butler',
      'health',
      'get_vitals_summary',
      { date: Date.now() }
    );
    if (healthSummary.success && healthSummary.data) {
      briefing += ` Daily step count stands at ${healthSummary.data.stepsToday} steps.`;
    }

    // Query Chef peer agent via bus for dinner plan
    const mealPlan = await agentBus.askAgent<{ mealType: string }, { recipeName: string }>(
      'butler',
      'chef',
      'get_scheduled_meal',
      { mealType: 'dinner' }
    );
    if (mealPlan.success && mealPlan.data) {
      briefing += ` Tonight's scheduled dinner is ${mealPlan.data.recipeName}.`;
    }

    return briefing;
  }

  clearAll(): void {
    this.calendarEvents.clear();
    this.reminders.clear();
  }
}

export const butlerAgent = ButlerAgentService.getInstance();
