import api from '@/lib/api/axios';
import type {
  ActivityType,
  DashboardStats,
  FitnessAchievement,
  FitnessGoal,
  PeriodStats,
  SessionsListResponse,
  TrackPoint,
  WorkoutSession,
} from '@/lib/tracker/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const fitnessTrackerAPI = {
  getActiveSession: () =>
    api.get<ApiResponse<WorkoutSession | null>>('/fitnessTracker/sessions/active'),

  startSession: (activityType: ActivityType, startedAt?: string) =>
    api.post<ApiResponse<WorkoutSession>>('/fitnessTracker/sessions', {
      activityType,
      ...(startedAt ? { startedAt } : {}),
      deviceMeta: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      },
    }),

  pauseSession: (id: string) =>
    api.patch<ApiResponse<WorkoutSession>>(`/fitnessTracker/sessions/${id}/pause`),

  resumeSession: (id: string) =>
    api.patch<ApiResponse<WorkoutSession>>(`/fitnessTracker/sessions/${id}/resume`),

  appendPoints: (id: string, batchIndex: number, points: TrackPoint[]) =>
    api.post<ApiResponse<{ batchIndex: number; accepted: number; pointCount: number }>>(
      `/fitnessTracker/sessions/${id}/points`,
      { batchIndex, points }
    ),

  finishSession: (
    id: string,
    options?: number | { totalPausedSec?: number; endedAt?: string }
  ) => {
    const body =
      typeof options === 'number'
        ? { totalPausedSec: options }
        : {
            ...(options?.totalPausedSec != null
              ? { totalPausedSec: options.totalPausedSec }
              : {}),
            ...(options?.endedAt ? { endedAt: options.endedAt } : {}),
          };
    return api.post<ApiResponse<WorkoutSession>>(
      `/fitnessTracker/sessions/${id}/finish`,
      body
    );
  },

  cancelSession: (id: string) =>
    api.delete<ApiResponse<WorkoutSession>>(`/fitnessTracker/sessions/${id}`),

  deleteSession: (id: string) =>
    api.delete<ApiResponse<{ _id: string }>>(`/fitnessTracker/sessions/${id}/history`),

  listSessions: (params?: {
    status?: string;
    activityType?: ActivityType;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<ApiResponse<SessionsListResponse>>('/fitnessTracker/sessions', { params }),

  getSession: (id: string) =>
    api.get<ApiResponse<WorkoutSession>>(`/fitnessTracker/sessions/${id}`),

  getSessionPoints: (id: string, page = 1, limit = 50) =>
    api.get<
      ApiResponse<{
        items: Array<{ batchIndex: number; points: TrackPoint[] }>;
        total: number;
        page: number;
        limit: number;
      }>
    >(`/fitnessTracker/sessions/${id}/points`, { params: { page, limit } }),

  getDashboardStats: () =>
    api.get<ApiResponse<DashboardStats>>('/fitnessTracker/stats/dashboard'),

  getWeeklyStats: () =>
    api.get<ApiResponse<PeriodStats>>('/fitnessTracker/stats/weekly'),

  getMonthlyStats: () =>
    api.get<ApiResponse<PeriodStats>>('/fitnessTracker/stats/monthly'),

  listGoals: () => api.get<ApiResponse<FitnessGoal[]>>('/fitnessTracker/goals'),

  createGoal: (data: Omit<FitnessGoal, '_id' | 'current' | 'percent'>) =>
    api.post<ApiResponse<FitnessGoal>>('/fitnessTracker/goals', data),

  updateGoal: (id: string, data: Partial<FitnessGoal>) =>
    api.patch<ApiResponse<FitnessGoal>>(`/fitnessTracker/goals/${id}`, data),

  deleteGoal: (id: string) =>
    api.delete<ApiResponse<FitnessGoal>>(`/fitnessTracker/goals/${id}`),

  listAchievements: () =>
    api.get<ApiResponse<FitnessAchievement[]>>('/fitnessTracker/achievements'),
};
