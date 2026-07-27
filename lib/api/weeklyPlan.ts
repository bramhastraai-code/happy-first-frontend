import { DateTime } from 'luxon';
import api from './axios';




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
 
export interface PlanChoiceState {
  needsPlanChoice: boolean;
  isMonday?: boolean;
  isMondayNoLogs?: boolean;
  canRepeat: boolean;
  previousScore?: number;
  currentPlanId?: string | null;
  currentPlanStatus?: string | null;
  canEditCurrent: boolean;
}

export interface WeeklyPlan {
  _id: string;
  user: string;
  memberLabel: string;
  activities: WeeklyPlanActivity[];
  weekStart: string;
  weekEnd: string;
  status: 'active' | 'completed' | 'carried-forward';
  unlockedSets?: number[];
  /** @deprecated typo kept for older payloads */
  unloockedSets?: number[];
  surpriseActivityStatus?: 'assigned' | 'none-left' | 'not-configured' | 'not-eligible' | 'none';
  needsPlanChoice?: boolean;
  canRepeat?: boolean;
  canEditCurrent?: boolean;
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
 
  getOptions: (planId?: string) =>
    api.get('/weeklyPlan/options', planId ? { params: { planId } } : undefined),
  
  getAnalytics: (weeklyPlanId: string, updateRanks = false) => 
    api.get<{ success: boolean; message: string; data: WeeklyPlanAnalytics }>(
      `/weeklyPlan/${weeklyPlanId}/analytics`,
      { params: { updateRanks } }
    ),
  
  create: (data: CreateWeeklyPlanData) => api.post('/weeklyPlan/create', data),

  update: (planId: string, data: CreateWeeklyPlanData) =>
    api.put<{ success: boolean; message: string; data: WeeklyPlan }>(
      `/weeklyPlan/${planId}`,
      data
    ),

  getById: (planId: string) =>
    api.get<{ success: boolean; message: string; data: WeeklyPlan }>(
      `/weeklyPlan/${planId}`
    ),
  
  getCurrent: (date? : string) => api.get<{ success: boolean; message: string; data: WeeklyPlan }>(
    '/weeklyPlan/current',{params:{date: date ?? DateTime.local().toFormat('yyyy-MM-dd')}}
  ),
  Upcomming: () => api.get<{ success: boolean; message: string; data: WeeklyPlan | null }>(
    '/weeklyPlan/upcoming'
  ),

  /** Returns upcoming plan or null — no plan is a normal state, not an error. */
  getUpcomingPlan: async (): Promise<WeeklyPlan | null> => {
    const response = await api.get<{ success: boolean; message: string; data: WeeklyPlan | null }>(
      '/weeklyPlan/upcoming'
    );
    return response.data.data ?? null;
  },

  getCurrentPlan: async (): Promise<WeeklyPlan | null> => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: WeeklyPlan | null;
      planChoice?: PlanChoiceState;
    }>(
      '/weeklyPlan/current',
      { params: { date: DateTime.local().toFormat('yyyy-MM-dd') } }
    );
    return response.data.data ?? null;
  },

  getCurrentPlanState: async (): Promise<{
    plan: WeeklyPlan | null;
    planChoice: PlanChoiceState | null;
  }> => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: WeeklyPlan | null;
      planChoice?: PlanChoiceState;
    }>(
      '/weeklyPlan/current',
      { params: { date: DateTime.local().toFormat('yyyy-MM-dd') } }
    );
    return {
      plan: response.data.data ?? null,
      planChoice: response.data.planChoice ?? null,
    };
  },

  firstSetup: (activities:CreateWeeklyPlanData) => api.post('/weeklyPlan/firstTimeSetup', activities),
  repeatLastWeek: () => api.post('/weeklyPlan/repeatLastWeek', {}),
};
