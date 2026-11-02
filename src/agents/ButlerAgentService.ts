import { agentBus } from '../kernel/AgentBusService';
import { jobQueue } from '../queue/JobQueue';
import { vaultDatabase } from '../security/VaultDatabase';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  category: 'meeting' | 'reminder' | 'focus_block' | 'personal';
}

export interface ButlerReminder {
  id: string;
  text: string;
  remindAt: number;
  isCompleted: boolean;
}

/**
 * The Butler Agent Domain Service.
 * Acts as a peer agent providing universal calendar management, reminders, and daily briefings.
 */
export class ButlerAgentService {
  private static instance: ButlerAgentService | null = null;
  private calendarEvents: CalendarEvent[] = [];
  private reminders: ButlerReminder[] = [];

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

    // 2. Peer agents can request Butler to schedule a reminder or calendar block
    agentBus.registerQueryHandler<{ title: string; startTime: number; endTime: number }, CalendarEvent>(
      'butler',
      'schedule_event',
      async (query) => {
        return this.addCalendarEvent(
          query.payload.title,
          query.payload.startTime,
          query.payload.endTime
        );
      }
    );
  }

  addCalendarEvent(
    title: string,
    startTime: number,
    endTime: number,
    category: CalendarEvent['category'] = 'meeting'
  ): CalendarEvent {
    const event: CalendarEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      startTime,
      endTime,
      category,
    };
    this.calendarEvents.push(event);
    return event;
  }

  getUpcomingEvents(): CalendarEvent[] {
    return [...this.calendarEvents];
  }

  addReminder(text: string, remindAt: number): ButlerReminder {
    const reminder: ButlerReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text,
      remindAt,
      isCompleted: false,
    };
    this.reminders.push(reminder);
    return reminder;
  }

  getReminders(): ButlerReminder[] {
    return [...this.reminders];
  }

  /**
   * Generates a consolidated morning/evening briefing by querying peer agents.
   */
  async generateDailyBriefing(): Promise<string> {
    const events = this.getUpcomingEvents();
    const reminders = this.getReminders().filter((r) => !r.isCompleted);

    let briefing = `Good day! You have ${events.length} event(s) scheduled and ${reminders.length} pending reminder(s).`;

    // Consult peer agent: Doctor (Health)
    const healthSummary = await agentBus.askAgent<{ date: number }, { stepsToday: number }>(
      'butler',
      'health',
      'get_vitals_summary',
      { date: Date.now() }
    );

    if (healthSummary.success && healthSummary.data) {
      briefing += ` Step counter records ${healthSummary.data.stepsToday} steps today.`;
    }

    return briefing;
  }
}

export const butlerAgent = ButlerAgentService.getInstance();
