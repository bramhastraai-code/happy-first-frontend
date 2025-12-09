import api from './axios';

export interface DailyLogActivity {
  activityId: string;
  value: number;
  pointsEarned?: number;
}

export interface SubmitDailyLogData {
  activities: DailyLogActivity[];
}

export interface DailySummary {
  date: string;
  activities: Array<{
    activityId: string;
    name: string;
    value: number;
    targetValue: number;
    percentComplete: number;
    pointsEarned: number;
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
  daysLogged: number;
}

export const dailyLogAPI = {
  submit: (data: SubmitDailyLogData) => api.post('/dailyLog', data),
  
  getSummary: (period: 'daily' | 'weekly', date?: string) => {
    const params = date ? { period, date } : { period };
    return api.get<{
      success: boolean;
      message: string;
      data: DailySummary | WeeklySummary;
    }>('/dailyLog/summary', { params });
  },
};
