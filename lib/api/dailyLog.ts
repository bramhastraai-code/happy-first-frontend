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

export const dailyLogAPI = {
  submit: (data: SubmitDailyLogData) => api.post('/dailyLog/web', data),
  
  getSummary: (period: 'daily' | 'weekly'|'monthly', date?: string) => {
    const params = date ? { period, date } : { period };
    return api.get<{
      success: boolean;
      message: string;
      data: DailySummary | WeeklySummary| MonthlySummary;
    }>('/dailyLog/summary', { params });
  },
};
