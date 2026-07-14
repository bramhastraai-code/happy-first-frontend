'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fitnessTrackerAPI } from '@/lib/tracker/api/fitnessTracker';
import { loadAllSessionPoints } from '@/lib/tracker/utils/sessionRestore';
import {
  invalidateAllTrackerQueries,
  trackerQueryOptions,
} from '@/lib/tracker/hooks/trackerQueries';
import type { ActivityType, FitnessGoal } from '@/lib/tracker/types';

export const trackerQueryKeys = {
  all: ['tracker'] as const,
  active: ['tracker', 'active'] as const,
  sessions: (filters?: Record<string, unknown>) => ['tracker', 'sessions', filters] as const,
  session: (id: string) => ['tracker', 'session', id] as const,
  dashboard: ['tracker', 'dashboard'] as const,
  goals: ['tracker', 'goals'] as const,
  achievements: ['tracker', 'achievements'] as const,
};

export function useActiveSession() {
  return useQuery({
    queryKey: trackerQueryKeys.active,
    queryFn: async () => {
      const res = await fitnessTrackerAPI.getActiveSession();
      return res.data.data;
    },
    ...trackerQueryOptions,
  });
}

export function useSessionHistory(filters?: {
  activityType?: ActivityType;
  status?: string;
  limit?: number;
}) {
  return useInfiniteQuery({
    queryKey: trackerQueryKeys.sessions(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fitnessTrackerAPI.listSessions({ ...filters, page: pageParam });
      return res.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    ...trackerQueryOptions,
    refetchInterval: 20_000,
  });
}

export function useSessionDetail(id: string) {
  return useQuery({
    queryKey: trackerQueryKeys.session(id),
    queryFn: async () => {
      const res = await fitnessTrackerAPI.getSession(id);
      return res.data.data;
    },
    enabled: Boolean(id),
    ...trackerQueryOptions,
  });
}

export function useSessionRoute(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...trackerQueryKeys.session(sessionId), 'route'] as const,
    queryFn: () => loadAllSessionPoints(sessionId),
    enabled: Boolean(sessionId) && enabled,
    ...trackerQueryOptions,
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fitnessTrackerAPI.deleteSession(id),
    onSuccess: async (_res, id) => {
      qc.removeQueries({ queryKey: trackerQueryKeys.session(id) });
      await invalidateAllTrackerQueries(qc);
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: trackerQueryKeys.dashboard,
    queryFn: async () => {
      const res = await fitnessTrackerAPI.getDashboardStats();
      return res.data.data;
    },
    ...trackerQueryOptions,
    refetchInterval: 15_000,
  });
}

export function useGoals() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: trackerQueryKeys.goals,
    queryFn: async () => {
      const res = await fitnessTrackerAPI.listGoals();
      return res.data.data;
    },
    ...trackerQueryOptions,
    refetchInterval: 30_000,
  });

  const createGoal = useMutation({
    mutationFn: (data: Omit<FitnessGoal, '_id' | 'current' | 'percent'>) =>
      fitnessTrackerAPI.createGoal(data),
    onSuccess: () => invalidateAllTrackerQueries(qc),
  });

  const deleteGoal = useMutation({
    mutationFn: (id: string) => fitnessTrackerAPI.deleteGoal(id),
    onSuccess: () => invalidateAllTrackerQueries(qc),
  });

  return { ...query, createGoal, deleteGoal };
}

export function useAchievements() {
  return useQuery({
    queryKey: trackerQueryKeys.achievements,
    queryFn: async () => {
      const res = await fitnessTrackerAPI.listAchievements();
      return res.data.data;
    },
    ...trackerQueryOptions,
    refetchInterval: 30_000,
  });
}
