import { date } from 'zod';
import api from './axios';

export interface WeeklyPlanActivity {
 activity: string;
  cadence: 'daily' | 'weekly';
  targetValue: number;
  achieved?: number;
  dailyTargets?: number;
  label?: string;
  pendingUnits?: number;
  pointsAllocated?: number;
  pointsPerUnit?: number;
  unit: string;
  TodayLogged:boolean;
}
 
export interface WeeklyPlan {
  _id: string;
  user: string;
  memberLabel: string;
  activities: WeeklyPlanActivity[];
  weekStart: string;
  weekEnd: string;
  status: 'active' | 'completed';
  unloockedSets : number[];
}

export interface CreateWeeklyPlanData {
  activities: Array<{
    activityId: string;
    cadence: 'daily' | 'weekly';
    targetValue: number;
  }>;
}

export const weeklyPlanAPI = {
  getOptions: () => api.get('/weeklyPlan/options'),
  
  create: (data: CreateWeeklyPlanData) => api.post('/weeklyPlan/create', data),
  
  getCurrent: () => api.get<{ success: boolean; message: string; data: WeeklyPlan }>(
    '/weeklyPlan/current',{params:{date: new Date().toISOString().split('T')[0]}}
  ),
  Upcomming: () => api.get<{ success: boolean; message: string; data: WeeklyPlan }>(
    '/weeklyPlan/upcoming'
  ),

  firstSetup: (activities:CreateWeeklyPlanData) => api.post('/weeklyPlan/firstTimeSetup', activities),
};
