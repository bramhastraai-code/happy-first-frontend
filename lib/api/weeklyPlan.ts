import { DateTime } from 'luxon';
import api from './axios';
import { useAuthStore } from '@/lib/store/authStore';
 const { profiles } = useAuthStore.getState();




export interface WeeklyPlanActivity {
 activity: string;
  cadence: 'daily' | 'weekly';
  targetValue: number;
  achieved?: number;
  achievedUnits?: number;
  dailyTargets?: number;
  label?: string;
  pendingUnits?: number;
  pointsAllocated?: number;
  pointsPerUnit?: number;
  unit: string;
  TodayLogged:boolean;
  values:[
    {
      tier:number;
      maxVal:number;
      minVal:number;
    }
  ]
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
    '/weeklyPlan/current',{params:{date: DateTime.local().toFormat('yyyy-MM-dd')}}
  ),
  Upcomming: () => api.get<{ success: boolean; message: string; data: WeeklyPlan }>(
    '/weeklyPlan/upcoming'
  ),

  firstSetup: (activities:CreateWeeklyPlanData) => api.post('/weeklyPlan/firstTimeSetup', activities, {params: {profile: profiles?.[0]?._id}}),
  repeatLastWeek: () => api.post('/weeklyPlan/repeatLastWeek', {}, {params: {profile: profiles?.[0]?._id}}),
};
