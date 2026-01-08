import api from './axios';

export interface DailyLogActivity {
  activityId: string;
  value: number;
  pointsEarned?: number;
}

export interface SubmitDailyLogData {
  activities: DailyLogActivity[];
}

export interface SubmitPreviousDailyLogData {
  date: string;
  activities: DailyLogActivity[];
}

export interface DailySummary {
  date: string;

  activities: Array<{
    activityId: string;
    achieved: number;
    activity: string;
    pointsAllocated: number;
    cadance: "daily" | "weekly";
    target: number;
    pointsEarned: number;
    unit: string;
    status: 'partial' | 'completed'|'pending';
  }>;
  totalPoints: number;
  streak: number;
}

export interface WeeklySummary {
  weekNumber: number;
  year: number;
  activities: Array<{
    activityId: string;
    name: string;
    totalValue: number;
    targetValue: number;
    percentComplete: number;
    pointsEarned: number;
  }>;
  totalPoints: number;
  totalDaysLogged: number;
}
export interface MonthlySummary {
  dailyBreakdown: Array<{
    date: string;
    points: number;
    activityCount: number;
  }>;
  activities: Array<{
    activityId: string;
    name: string;
    totalValue: number;
    targetValue: number;
    percentComplete: number;
    pointsEarned: number;
  }>;
  period: {
    start:Date;
    end:Date;
  };
  totalPoints: number;
  totalDaysLogged: number;
}

export interface MissedDay {
  date: string;
  reason: string;
  pointsLost: number;
  target: number;
  achieved: number;
  unit: string;
}

export interface PartialDay {
  date: string;
  reason: string;
  pointsLost: number;
  target: number;
  achieved: number;
  unit: string;
}

export interface DailyActivityLoss {
  activity: string;
  activityId: string;
  cadence: 'daily';
  potentialPoints: number;
  earnedPoints: number;
  pointsLost: number;
  missedDays: MissedDay[];
  partialDays: PartialDay[];
  unit: string;
}

export interface WeeklyActivityLoss {
  activity: string;
  activityId: string;
  cadence: 'weekly';
  potentialPoints: number;
  earnedPoints: number;
  pointsLost: number;
  target: number;
  achieved: number;
  unit: string;
  reason: string;
  daysLogged: number;
}

export interface PointLossesData {
  weekStart: string;
  weekEnd: string;
  totalPotentialPoints: number;
  totalPointsEarned: number;
  totalPointsLost: number;
  lossPercentage: string;
  pointLossDetails: (DailyActivityLoss | WeeklyActivityLoss)[];
  summary: {
    activitiesWithLosses: number;
    totalActivities: number;
  };
}

export interface StreakData {
  overallStreak: {
    currentStreak: number;
    longestStreak: number;
    lastLoggedDate: string;
    totalDaysLogged: number;
  };
  activityStreaks: Array<{
    activityId: string;
    activityName: string;
    currentStreak: number;
    longestStreak: number;
    totalDaysLogged: number;
  }>;
}

export interface CalendarDay {
  date: string;
  day: number;
  dayOfWeek: string;
  dayOfWeekShort: string;
  hasLog: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface ActivityCalendarDay extends CalendarDay {
  value: number;
  pointsEarned: number;
  unit: string | null;
}

export interface CalendarData {
  month: number;
  year: number;
  monthName: string;
  monthStart: string;
  monthEnd: string;
  calendarDays: CalendarDay[];
  statistics: {
    totalDays: number;
    daysLogged: number;
    daysNotLogged: number;
    completionPercentage: string;
  };
  pagination: {
    currentMonth: number;
    currentYear: number;
    previousMonth: {
      month: number;
      year: number;
    };
    nextMonth: {
      month: number;
      year: number;
      available: boolean;
    };
    canGoPrevious: boolean;
    canGoNext: boolean;
  };
}

export interface ActivityCalendarData {
  activityId: string;
  activityName: string;
  month: number;
  year: number;
  monthName: string;
  monthStart: string;
  monthEnd: string;
  calendarDays: ActivityCalendarDay[];
  statistics: {
    totalDays: number;
    daysLogged: number;
    daysNotLogged: number;
    completionPercentage: string;
    totalValue: number;
    totalPoints: number;
  };
  pagination: {
    currentMonth: number;
    currentYear: number;
    previousMonth: {
      month: number;
      year: number;
    };
    nextMonth: {
      month: number;
      year: number;
      available: boolean;
    };
    canGoPrevious: boolean;
    canGoNext: boolean;
  };
}

export const dailyLogAPI = {
  submit: (data: SubmitDailyLogData) => api.post('/dailyLog/web', data),
  
  submitPrevious: (data: SubmitPreviousDailyLogData) => api.post('/dailyLog/previous', data),
  
  getSummary: (period: 'daily' | 'weekly'|'monthly', date?: string) => {
    const params = date ? { period, date } : { period };
    return api.get<{
      success: boolean;
      message: string;
      data: DailySummary | WeeklySummary| MonthlySummary;
    }>('/dailyLog/summary', { params });
  },

  getPointLosses: (weekStart?: string) => {
    const params = weekStart ? { weekStart } : {};
    return api.get<{
      success: boolean;
      message: string;
      data: PointLossesData;
    }>('/dailyLog/point-losses', { params });
  },

  getStreaks: (profileId: string) => {
    return api.get<{
      success: boolean;
      message: string;
      data: StreakData;
    }>(`/dailyLog/streaks/${profileId}`);
  },

  getCalendar: (profileId: string, month?: number, year?: number) => {
    const params: { month?: number; year?: number } = {};
    if (month !== undefined) params.month = month;
    if (year !== undefined) params.year = year;
    return api.get<{
      success: boolean;
      message: string;
      data: CalendarData;
    }>(`/dailyLog/calendar/${profileId}`, { params });
  },

  getActivityCalendar: (profileId: string, activityId: string, month?: number, year?: number) => {
    const params: { month?: number; year?: number } = {};
    if (month !== undefined) params.month = month;
    if (year !== undefined) params.year = year;
    return api.get<{
      success: boolean;
      message: string;
      data: ActivityCalendarData;
    }>(`/dailyLog/calendar/activity/${profileId}/${activityId}`, { params });
  },
};
