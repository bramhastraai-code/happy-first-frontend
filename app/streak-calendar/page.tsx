'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import type { ActivityCalendarData, CalendarData } from '@/lib/api/dailyLog';
import MainLayout from '@/components/layout/MainLayout';
import { StreakCalendarView } from '@/components/streak-calendar/StreakCalendarView';
import { useStreakData, useCalendarData } from '@/lib/queries/useCalendarQueries';
import LoadingScreen from '@/components/ui/LoadingScreen';

type FilterType = 'overall' | 'activity';

export default function StreakCalendarPage() {
  const router = useRouter();
  const { accessToken, isHydrated, selectedProfile } = useAuthStore();
  const [filterType, setFilterType] = useState<FilterType>('activity');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [showActivityList, setShowActivityList] = useState(true);
  const [monthlyLeaderboardPage, setMonthlyLeaderboardPage] = useState(1);
  const [allTimeLeaderboardPage, setAllTimeLeaderboardPage] = useState(1);

  const enabled = isHydrated && !!accessToken && !!selectedProfile?._id;

  const streakQuery = useStreakData(selectedProfile?._id, enabled);
  const calendarQuery = useCalendarData(
    selectedProfile?._id,
    currentMonth,
    currentYear,
    filterType,
    selectedActivityId,
    monthlyLeaderboardPage,
    allTimeLeaderboardPage,
    enabled
  );

  const streakData = streakQuery.data ?? null;
  const calendarData =
    filterType === 'overall' ? ((calendarQuery.data as CalendarData | undefined) ?? null) : null;
  const activityCalendarData =
    filterType === 'activity' ? ((calendarQuery.data as ActivityCalendarData | undefined) ?? null) : null;

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || !selectedProfile) {
      router.push('/login');
    }
  }, [accessToken, isHydrated, selectedProfile, router]);

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
    setCurrentMonth(new Date().getMonth() + 1);
    setCurrentYear(new Date().getFullYear());
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
        isCalendarFetching={calendarQuery.isFetching}
        selectedProfileId={selectedProfile?._id}
        onFilterChange={handleFilterChange}
        onActivitySelect={handleActivitySelect}
        onBackToActivityList={handleBackToActivityList}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onMonthlyLeaderboardPageChange={setMonthlyLeaderboardPage}
        onAllTimeLeaderboardPageChange={setAllTimeLeaderboardPage}
      />
    </MainLayout>
  );
}
