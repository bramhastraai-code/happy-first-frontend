'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useWeekAnalysisData } from '@/lib/hooks/useWeekAnalysisData';
import {
  WeekAnalysisError,
  WeekAnalysisLoading,
  WeekAnalysisView,
} from '@/components/week-analysis/WeekAnalysisView';
import MainLayout from '@/components/layout/MainLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import {
  latestCompletedWeekStartISO,
  resolveWeekStartISO,
} from '@/lib/utils/weekDate';

function WeekAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isHydrated, sessionReady } = useAuthStore();
  const weekStartParam = searchParams.get('weekStart');
  const resolvedWeekStart = resolveWeekStartISO(weekStartParam);

  const { data, isLoading, isError, error, refetch } = useWeekAnalysisData(resolvedWeekStart);

  useEffect(() => {
    if (!isHydrated || !sessionReady) return;
    if (!accessToken) router.push('/login');
  }, [accessToken, isHydrated, sessionReady, router]);

  // Never analyse the in-progress week — rewrite the URL to a completed week.
  useEffect(() => {
    if (!isHydrated || !sessionReady || !accessToken) return;
    if (weekStartParam !== resolvedWeekStart) {
      router.replace(`/week-analysis?weekStart=${resolvedWeekStart || latestCompletedWeekStartISO()}`);
    }
  }, [accessToken, isHydrated, sessionReady, resolvedWeekStart, router, weekStartParam]);

  if (!isHydrated || !sessionReady || !accessToken) {
    return <WeekAnalysisLoading />;
  }

  if (isLoading) {
    return <WeekAnalysisLoading />;
  }

  if (isError || !data) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error instanceof Error ? error.message : 'Failed to load weekly analysis data');
    return <WeekAnalysisError message={message} onRetry={() => void refetch()} />;
  }

  return <WeekAnalysisView data={data} onWeekChange={(weekStart) => router.push(`/week-analysis?weekStart=${weekStart}`)} />;
}

export default function WeekAnalysisPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <LoadingScreen fullScreen label="Loading week analysis…" />
        </MainLayout>
      }
    >
      <WeekAnalysisContent />
    </Suspense>
  );
}
