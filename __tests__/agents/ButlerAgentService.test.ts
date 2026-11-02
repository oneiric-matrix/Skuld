import { ButlerAgentService, CalendarEvent, ButlerReminder } from '../../src/agents/ButlerAgentService';
import { agentBus } from '../../src/kernel/AgentBusService';

describe('ButlerAgentService', () => {
  let butler: ButlerAgentService;

  beforeEach(() => {
    butler = ButlerAgentService.getInstance();
    butler.clearAll();
  });

  describe('Calendar Operations', () => {
    test('positive: should add and retrieve upcoming calendar events in chronological order', () => {
      const now = Date.now();
      const event1 = butler.addCalendarEvent('Dentist Appointment', now + 20000, now + 30000, 'personal');
      const event2 = butler.addCalendarEvent('Team Standup', now + 1000, now + 5000, 'meeting');

      const events = butler.getUpcomingEvents();
      expect(events.length).toBe(2);
      expect(events[0].title).toBe('Team Standup');
      expect(events[1].title).toBe('Dentist Appointment');
    });

    test('negative: should throw error if event title is empty or whitespace', () => {
      const now = Date.now();
      expect(() => butler.addCalendarEvent('  ', now, now + 1000)).toThrow('Event title cannot be empty');
    });

    test('negative: should throw error if endTime is equal or before startTime', () => {
      const now = Date.now();
      expect(() => butler.addCalendarEvent('Sprint Review', now + 5000, now + 1000)).toThrow(
        'Event end time must be after start time'
      );
    });

    test('positive: should delete calendar event by id', () => {
      const now = Date.now();
      const ev = butler.addCalendarEvent('One-on-One', now + 1000, now + 2000);
      expect(butler.deleteCalendarEvent(ev.id)).toBe(true);
      expect(butler.getUpcomingEvents().length).toBe(0);
    });
  });

  describe('Reminder Operations', () => {
    test('positive: should add reminders, toggle completed state, and filter pending', () => {
      const now = Date.now();
      const r1 = butler.addReminder('Drink water', now + 1000, 'high');
      const r2 = butler.addReminder('Call electrician', now + 5000, 'normal');

      expect(butler.getReminders(false).length).toBe(2);

      butler.toggleReminder(r1.id);
      expect(butler.getReminders(false).length).toBe(1);
      expect(butler.getReminders(true).length).toBe(2);
    });

    test('negative: should throw error if reminder text is empty', () => {
      expect(() => butler.addReminder('', Date.now())).toThrow('Reminder text cannot be empty');
    });

    test('negative: should throw error if toggling nonexistent reminder', () => {
      expect(() => butler.toggleReminder('nonexistent_id')).toThrow('not found');
    });

    test('positive: should delete reminder by id', () => {
      const r = butler.addReminder('Test deletion', Date.now());
      expect(butler.deleteReminder(r.id)).toBe(true);
      expect(butler.getReminders(true).length).toBe(0);
    });
  });

  describe('Inter-Agent Coordination via Bus', () => {
    test('positive: peer agent can query Butler schedule through Agent Bus', async () => {
      const now = Date.now();
      butler.addCalendarEvent('Deep Work Block', now + 1000, now + 10000, 'focus_block');

      const response = await agentBus.askAgent<{ dateTimestamp: number }, CalendarEvent[]>(
        'pm',
        'butler',
        'query_schedule',
        { dateTimestamp: now }
      );

      expect(response.success).toBe(true);
      expect(response.data?.length).toBe(1);
      expect(response.data?.[0].title).toBe('Deep Work Block');
    });

    test('positive: peer agent can request Butler to schedule an event via Agent Bus', async () => {
      const now = Date.now();
      const response = await agentBus.askAgent<
        { title: string; startTime: number; endTime: number },
        CalendarEvent
      >('chef', 'butler', 'schedule_event', {
        title: 'Dinner Reservation',
        startTime: now + 5000,
        endTime: now + 9000,
      });

      expect(response.success).toBe(true);
      expect(response.data?.title).toBe('Dinner Reservation');
      expect(butler.getUpcomingEvents().length).toBe(1);
    });

    test('positive: generateDailyBriefing queries peer agents (health, chef) to compile briefing', async () => {
      // Mock peer agent response for Health
      agentBus.registerQueryHandler('health', 'get_vitals_summary', async () => {
        return { stepsToday: 8420 };
      });

      // Mock peer agent response for Chef
      agentBus.registerQueryHandler('chef', 'get_scheduled_meal', async () => {
        return { recipeName: 'Grilled Salmon with Asparagus' };
      });

      const briefing = await butler.generateDailyBriefing();
      expect(briefing).toContain('8420 steps');
      expect(briefing).toContain('Grilled Salmon with Asparagus');
    });
  });
});
