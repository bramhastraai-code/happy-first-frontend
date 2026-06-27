export const STALE = {
  /** Dashboard aggregates — refresh in background after 2 min */
  dashboard: 2 * 60 * 1000,
  /** Daily log for a specific date */
  daily: 5 * 60 * 1000,
  /** Calendar month grid */
  calendar: 10 * 60 * 1000,
  /** Streak stats */
  streaks: 5 * 60 * 1000,
  /** User profile info */
  user: 5 * 60 * 1000,
} as const;

export const GC = {
  default: 30 * 60 * 1000,
} as const;

export const queryKeys = {
  weeklyPlan: {
    current: (date: string, profileId?: string) =>
      ['weeklyPlan', 'current', date, profileId ?? 'none'] as const,
    upcoming: (profileId?: string) =>
      ['weeklyPlan', 'upcoming', profileId ?? 'none'] as const,
  },
  dailyLog: {
    summary: (period: 'daily' | 'weekly' | 'monthly', date: string, profileId?: string) =>
      ['dailyLog', 'summary', period, date, profileId ?? 'none'] as const,
    streaks: (profileId: string) => ['dailyLog', 'streaks', profileId] as const,
    calendar: (profileId: string, month: number, year: number) =>
      ['dailyLog', 'calendar', profileId, month, year] as const,
    activityCalendar: (profileId: string, activityId: string, month: number, year: number) =>
      ['dailyLog', 'activityCalendar', profileId, activityId, month, year] as const,
  },
  auth: {
    userInfo: (profileId?: string) => ['auth', 'userInfo', profileId ?? 'none'] as const,
  },
  activities: {
    list: () => ['activities', 'list'] as const,
  },
} as const;
