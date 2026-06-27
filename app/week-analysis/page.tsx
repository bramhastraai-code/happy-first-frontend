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

function WeekAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isHydrated } = useAuthStore();
  const weekStartParam = searchParams.get('weekStart');

  const { data, isLoading, isError, error, refetch } = useWeekAnalysisData(weekStartParam);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken) router.push('/login');
  }, [accessToken, isHydrated, router]);

  if (!isHydrated || !accessToken) {
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

  return <WeekAnalysisView data={data} />;
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
