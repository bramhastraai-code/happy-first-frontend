'use client';

import { useQuery } from '@tanstack/react-query';
import { dailyLogAPI, type PointLossesData } from '@/lib/api/dailyLog';
import { weeklyPlanAPI, type WeeklyPlan, type WeeklyPlanAnalytics } from '@/lib/api/weeklyPlan';
import { useAuthStore } from '@/lib/store/authStore';
import { resolveWeekStartISO } from '@/lib/utils/weekDate';

export interface WeekAnalysisData {
  weekStart: string;
  plan: WeeklyPlan | null;
  analytics: WeeklyPlanAnalytics | null;
  pointLosses: PointLossesData;
}

function normalizePointLosses(
  raw: Partial<PointLossesData> & { earnedPoints?: number; potentialPoints?: number },
  weekStart: string
): PointLossesData {
  return {
    weekStart: String(raw.weekStart ?? weekStart),
    weekEnd: String(raw.weekEnd ?? ''),
    totalPotentialPoints: Number(raw.totalPotentialPoints ?? raw.potentialPoints ?? 0),
    totalPointsEarned: Number(raw.totalPointsEarned ?? raw.earnedPoints ?? 0),
    totalPointsLost: Number(raw.totalPointsLost ?? 0),
    lossPercentage: raw.lossPercentage ?? '0.00',
    pointLossDetails: raw.pointLossDetails ?? [],
    summary: raw.summary ?? {
      activitiesWithLosses: 0,
      totalActivities: 0,
    },
  };
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }
  return fallback;
}

export function useWeekAnalysisData(weekStartInput?: string | null) {
  const { accessToken, isHydrated, selectedProfile } = useAuthStore();
  const weekStart = resolveWeekStartISO(weekStartInput);

  return useQuery({
    queryKey: ['weekAnalysis', selectedProfile?._id, weekStart],
    enabled: isHydrated && !!accessToken && !!selectedProfile?._id,
    queryFn: async (): Promise<WeekAnalysisData> => {
      const [planResponse, pointLossesResponse] = await Promise.all([
        weeklyPlanAPI.getCurrent(weekStart),
        dailyLogAPI.getPointLosses(weekStart),
      ]);

      const plan = planResponse.data.data ?? null;
      const pointLosses = normalizePointLosses(pointLossesResponse.data.data ?? {}, weekStart);

      let analytics: WeeklyPlanAnalytics | null = null;
      if (plan?._id) {
        const analyticsResponse = await weeklyPlanAPI.getAnalytics(plan._id);
        analytics = analyticsResponse.data.data ?? null;
      }

      return { weekStart, plan, analytics, pointLosses };
    },
    meta: {
      extractErrorMessage,
    },
  });
}
