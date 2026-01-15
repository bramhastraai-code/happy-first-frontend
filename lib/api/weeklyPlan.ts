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
  dailyTarget?: number;
  label?: string;
  pendingUnits?: number;
  pointsAllocated?: number;
  pointsPerUnit?: number;
  unit: string;
  TodayLogged:boolean;
  isSurpriseActivity?:boolean;
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

export interface ActivityAnalytics {
  activityId: string;
  activityLabel: string;
  cadence: 'daily' | 'weekly';
  targetValue: number;
  unit: string;
  achievedUnits: number;
  pendingUnits: number;
  achievementPercentage: number;
  pointsAllocated: number;
  pointsPerUnit: number;
  totalPointsAchieved: number;
  rank: number;
  totalParticipants: number;
  rankPercentile: number;
  isSurpriseActivity: boolean;
}

export interface WeeklyPlanAnalytics {
  weeklyPlanId: string;
  profile: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  activities: ActivityAnalytics[];
  summary: {
    totalActivities: number;
    totalPointsAllocated: number;
    totalPointsAchieved: number;
  };
}

export const weeklyPlanAPI = {
 
  getOptions: () => api.get('/weeklyPlan/options'),
  
  getAnalytics: (weeklyPlanId: string, updateRanks = false) => 
    api.get<{ success: boolean; message: string; data: WeeklyPlanAnalytics }>(
      `/weeklyPlan/${weeklyPlanId}/analytics`,
      { params: { updateRanks } }
    ),
  
  create: (data: CreateWeeklyPlanData) => api.post('/weeklyPlan/create', data),
  
  getCurrent: (date? : string) => api.get<{ success: boolean; message: string; data: WeeklyPlan }>(
    '/weeklyPlan/current',{params:{date: date ?? DateTime.local().toFormat('yyyy-MM-dd')}}
  ),
  Upcomming: () => api.get<{ success: boolean; message: string; data: WeeklyPlan }>(
    '/weeklyPlan/upcoming'
  ),

  firstSetup: (activities:CreateWeeklyPlanData) => api.post('/weeklyPlan/firstTimeSetup', activities, {params: {profile: profiles?.[0]?._id}}),
  repeatLastWeek: () => api.post('/weeklyPlan/repeatLastWeek', {}, {params: {profile: profiles?.[0]?._id}}),
};
