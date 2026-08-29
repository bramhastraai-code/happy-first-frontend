import api from './axios';
import { todayInProfileZone } from '@/lib/utils/profileTime';




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
  weekendPrompt?: {
    show: boolean;
    weekday: number;
    snoozed?: boolean;
    canCreate: boolean;
    canRepeat: boolean;
    canPause: boolean;
    canRemindLater: boolean;
    previousScore?: number;
    nextWeekStart?: string | Date;
    nextPlanId?: string;
  };
}

export type WeekTarget = 'current' | 'next';

export interface WeeklyPlan {
  _id: string;
  user: string;
  memberLabel: string;
  activities: WeeklyPlanActivity[];
  weekStart: string;
  weekEnd: string;
  status: 'active' | 'completed' | 'carried-forward' | 'paused';
  unlockedSets?: number[];
  /** @deprecated typo kept for older payloads */
  unloockedSets?: number[];
  surpriseActivityStatus?: 'assigned' | 'none-left' | 'not-configured' | 'not-eligible' | 'none';
  needsPlanChoice?: boolean;
  canRepeat?: boolean;
  canEditCurrent?: boolean;
}

export type WeeklyMood = 'lovely' | 'good' | 'mixed' | 'tough' | 'exhausted';

export interface CreateWeeklyPlanData {
  activities: Array<{
    activityId: string;
    cadence: 'daily' | 'weekly';
    targetValue: number;
  }>;
  startingWeight?: number;
  weeklyMood?: WeeklyMood;
  weight?: number;
  mood?: WeeklyMood;
  /** Explicit week: this calendar week or next Monday week */
  weekTarget?: WeekTarget;
}

export interface RepeatWeeklyPlanData {
  activities?: CreateWeeklyPlanData['activities'];
  startingWeight?: number;
  weeklyMood?: WeeklyMood;
  weight?: number;
  mood?: WeeklyMood;
  weekTarget?: WeekTarget;
}

export interface WeightMoodHistoryPoint {
  weekStart: string;
  weekEnd: string;
  weight?: number | null;
  mood?: WeeklyMood | null;
  status?: string;
}

export interface NextWeekPreview {
  weekStart: string;
  weekEnd: string;
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
    '/weeklyPlan/current',{params:{date: date ?? todayInProfileZone()}}
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
      { params: { date: todayInProfileZone() } }
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
      { params: { date: todayInProfileZone() } }
    );
    return {
      plan: response.data.data ?? null,
      planChoice: response.data.planChoice ?? null,
    };
  },

  firstSetup: (activities: CreateWeeklyPlanData) => api.post('/weeklyPlan/firstTimeSetup', activities),

  repeatLastWeek: (data?: RepeatWeeklyPlanData) =>
    api.post('/weeklyPlan/repeatLastWeek', data ?? {}),

  pauseNextWeek: () =>
    api.post<{ success: boolean; message: string }>('/weeklyPlan/pauseNextWeek'),

  snoozeWeekendPrompt: () =>
    api.post<{ success: boolean; message: string; data: { planPromptSnoozeUntil: string } }>(
      '/weeklyPlan/snoozeWeekendPrompt'
    ),

  getWeightMoodHistory: (limit = 12) =>
    api.get<{ success: boolean; message: string; data: { points: WeightMoodHistoryPoint[] } }>(
      '/weeklyPlan/weight-mood-history',
      { params: { limit } }
    ),

  getNextWeekPreview: () =>
    api.get<{ success: boolean; message: string; data: NextWeekPreview }>(
      '/weeklyPlan/next-week-preview'
    ),
};
