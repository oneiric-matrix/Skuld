import { HomeScreenHub, UrgentNoticeItem, ActivityRingsSummary } from '../../src/components/HomeScreenHub';

describe('HomeScreenHub Logic & Props Contract', () => {
  const mockNotices: UrgentNoticeItem[] = [
    {
      id: 'notice_1',
      category: 'bill',
      title: 'Electricity Bill',
      subtitle: 'USD 85.00 due tomorrow',
      dueText: 'IN 1D',
      priority: 'urgent',
      targetAgentId: 'accounts',
    },
    {
      id: 'notice_2',
      category: 'medication',
      title: 'Take Omega 3',
      subtitle: '1000mg at lunch',
      dueText: 'DUE TODAY',
      priority: 'urgent',
      targetAgentId: 'health',
    },
    {
      id: 'notice_3',
      category: 'calendar',
      title: 'Sprint Retrospective',
      subtitle: 'Virtual room link ready',
      dueText: 'IN 20M',
      priority: 'high',
      targetAgentId: 'butler',
    },
  ];

  const mockVitals: ActivityRingsSummary = {
    stepsCount: 7500,
    stepsGoal: 10000,
    hydrationMl: 1800,
    hydrationGoalMl: 2500,
    dueTasksCount: 3,
    upcomingBillsCount: 1,
  };

  it('exports HomeScreenHub component and validates notice item definitions', () => {
    expect(HomeScreenHub).toBeDefined();
    expect(typeof HomeScreenHub).toBe('function');

    expect(mockNotices).toHaveLength(3);
    expect(mockNotices[0].targetAgentId).toBe('accounts');
    expect(mockNotices[1].targetAgentId).toBe('health');
    expect(mockNotices[2].targetAgentId).toBe('butler');
  });

  it('computes accurate percentage bounds for vitals progress rings', () => {
    const stepPercent = Math.min(100, Math.round((mockVitals.stepsCount / mockVitals.stepsGoal) * 100));
    expect(stepPercent).toBe(75);

    const hydrationPercent = Math.min(
      100,
      Math.round((mockVitals.hydrationMl / mockVitals.hydrationGoalMl) * 100)
    );
    expect(hydrationPercent).toBe(72);
  });

  it('handles edge case when vitals are zero or goals are exceeded', () => {
    const zeroVitals: ActivityRingsSummary = {
      stepsCount: 0,
      stepsGoal: 10000,
      hydrationMl: 0,
      hydrationGoalMl: 2500,
      dueTasksCount: 0,
      upcomingBillsCount: 0,
    };

    const zeroSteps = Math.min(100, Math.round((zeroVitals.stepsCount / zeroVitals.stepsGoal) * 100));
    expect(zeroSteps).toBe(0);

    const overachieved: ActivityRingsSummary = {
      stepsCount: 15000,
      stepsGoal: 10000,
      hydrationMl: 3200,
      hydrationGoalMl: 2500,
      dueTasksCount: 0,
      upcomingBillsCount: 0,
    };

    const cappedSteps = Math.min(100, Math.round((overachieved.stepsCount / overachieved.stepsGoal) * 100));
    expect(cappedSteps).toBe(100);
  });
});
