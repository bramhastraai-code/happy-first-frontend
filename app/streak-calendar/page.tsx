'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import type { ActivityCalendarData, CalendarData } from '@/lib/api/dailyLog';
import { weeklyPlanAPI, type WeightMoodHistoryPoint } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { StreakCalendarView } from '@/components/streak-calendar/StreakCalendarView';
import {
  prefetchCalendarMonth,
  useAllTimeLeaderboard,
  useCalendarData,
  useStreakData,
} from '@/lib/queries/useCalendarQueries';
import LoadingScreen from '@/components/ui/LoadingScreen';

type FilterType = 'overall' | 'activity';

export default function StreakCalendarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isHydrated, sessionReady, selectedProfile } = useAuthStore();
  const [filterType, setFilterType] = useState<FilterType>('activity');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [showActivityList, setShowActivityList] = useState(true);
  const [monthlyLeaderboardPage, setMonthlyLeaderboardPage] = useState(1);
  const [allTimeLeaderboardPage, setAllTimeLeaderboardPage] = useState(1);
  const [loadAllTimeLeaderboard, setLoadAllTimeLeaderboard] = useState(false);
  const [weightMoodHistory, setWeightMoodHistory] = useState<WeightMoodHistoryPoint[]>([]);

  const enabled = isHydrated && sessionReady && !!accessToken && !!selectedProfile?._id;
  const activityIdForQuery = filterType === 'activity' ? selectedActivityId : '';

  const streakQuery = useStreakData(selectedProfile?._id, enabled);
  const calendarQuery = useCalendarData(
    selectedProfile?._id,
    currentMonth,
    currentYear,
    filterType,
    activityIdForQuery,
    monthlyLeaderboardPage,
    allTimeLeaderboardPage,
    enabled
  );
  const allTimeLeaderboardQuery = useAllTimeLeaderboard(
    selectedProfile?._id,
    allTimeLeaderboardPage,
    filterType === 'activity' && selectedActivityId ? selectedActivityId : undefined,
    enabled && loadAllTimeLeaderboard
  );

  const streakData = streakQuery.data ?? null;
  const baseCalendarData =
    filterType === 'overall' ? ((calendarQuery.data as CalendarData | undefined) ?? null) : null;
  const baseActivityCalendarData =
    filterType === 'activity' ? ((calendarQuery.data as ActivityCalendarData | undefined) ?? null) : null;

  const calendarData = useMemo(() => {
    if (!baseCalendarData) return null;
    return {
      ...baseCalendarData,
      allTimeLeaderboard:
        allTimeLeaderboardQuery.data ?? baseCalendarData.allTimeLeaderboard,
    };
  }, [allTimeLeaderboardQuery.data, baseCalendarData]);

  const activityCalendarData = useMemo(() => {
    if (!baseActivityCalendarData) return null;
    return {
      ...baseActivityCalendarData,
      allTimeLeaderboard:
        allTimeLeaderboardQuery.data ?? baseActivityCalendarData.allTimeLeaderboard,
    };
  }, [allTimeLeaderboardQuery.data, baseActivityCalendarData]);

  useEffect(() => {
    if (!enabled) return;

    weeklyPlanAPI
      .getWeightMoodHistory(12)
      .then((res) => setWeightMoodHistory(res.data.data?.points ?? []))
      .catch((err) => {
        console.error('Failed to load weight/mood history:', err);
        setWeightMoodHistory([]);
      });
  }, [enabled]);

  useEffect(() => {
    if (!isHydrated || !sessionReady) return;
    if (!accessToken || !selectedProfile) {
      router.push('/login');
    }
  }, [accessToken, isHydrated, sessionReady, selectedProfile, router]);

  useEffect(() => {
    const currentCalendar = activityCalendarData || calendarData;
    if (!enabled || !selectedProfile?._id || !currentCalendar) return;

    const { previousMonth, nextMonth, canGoNext } = currentCalendar.pagination;
    void prefetchCalendarMonth(
      queryClient,
      selectedProfile._id,
      previousMonth.month,
      previousMonth.year,
      filterType,
      activityIdForQuery
    );
    if (canGoNext && nextMonth.available) {
      void prefetchCalendarMonth(
        queryClient,
        selectedProfile._id,
        nextMonth.month,
        nextMonth.year,
        filterType,
        activityIdForQuery
      );
    }
  }, [
    activityCalendarData,
    activityIdForQuery,
    calendarData,
    enabled,
    filterType,
    queryClient,
    selectedProfile?._id,
  ]);

  const handlePreviousMonth = () => {
    const currentCalendar = activityCalendarData || calendarData;
    if (currentCalendar?.pagination.canGoPrevious) {
      setCurrentMonth(currentCalendar.pagination.previousMonth.month);
      setCurrentYear(currentCalendar.pagination.previousMonth.year);
      setMonthlyLeaderboardPage(1);
    }
  };

  const handleNextMonth = () => {
    const currentCalendar = activityCalendarData || calendarData;
    if (currentCalendar?.pagination.canGoNext) {
      setCurrentMonth(currentCalendar.pagination.nextMonth.month);
      setCurrentYear(currentCalendar.pagination.nextMonth.year);
      setMonthlyLeaderboardPage(1);
    }
  };

  const handleJumpToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth() + 1);
    setCurrentYear(now.getFullYear());
    setMonthlyLeaderboardPage(1);
  };

  const handleFilterChange = (type: FilterType) => {
    setFilterType(type);
    if (type === 'overall') {
      setSelectedActivityId('');
      setShowActivityList(false);
      return;
    }

    setSelectedActivityId('');
    setShowActivityList(true);
  };

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivityId(activityId);
    setFilterType('activity');
    setShowActivityList(false);
    setMonthlyLeaderboardPage(1);
    setAllTimeLeaderboardPage(1);
  };

  const handleBackToActivityList = () => {
    setShowActivityList(true);
    setSelectedActivityId('');
  };

  if (!isHydrated || (streakQuery.isPending && !streakData)) {
    return (
      <MainLayout>
        <LoadingScreen fullScreen label="Loading streak data…" />
      </MainLayout>
    );
  }

  if (!streakData) {
    return (
      <MainLayout>
        <LoadingScreen fullScreen label="Loading streak data…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <StreakCalendarView
        streakData={streakData}
        filterType={filterType}
        selectedActivityId={selectedActivityId}
        showActivityList={showActivityList}
        calendarData={calendarData}
        activityCalendarData={activityCalendarData}
        isCalendarFetching={calendarQuery.isFetching || allTimeLeaderboardQuery.isFetching}
        selectedProfileId={selectedProfile?._id}
        weightMoodHistory={weightMoodHistory}
        onFilterChange={handleFilterChange}
        onActivitySelect={handleActivitySelect}
        onBackToActivityList={handleBackToActivityList}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onJumpToCurrentMonth={handleJumpToCurrentMonth}
        onMonthlyLeaderboardPageChange={setMonthlyLeaderboardPage}
        onAllTimeLeaderboardPageChange={setAllTimeLeaderboardPage}
        onLeaderboardScopeChange={(scope) => {
          if (scope === 'overall') setLoadAllTimeLeaderboard(true);
        }}
      />
    </MainLayout>
  );
}
