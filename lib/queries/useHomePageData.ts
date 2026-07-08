'use client';

import { useMemo } from 'react';
import {
  useQuery,
  useQueryClient,
  useQueries,
  keepPreviousData,
} from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { GC, queryKeys, STALE } from '@/lib/queries/keys';
import { invalidateDashboardQueries } from '@/lib/queries/invalidateDashboard';
import {
  fetchCurrentPlan,
  fetchUpcomingPlan,
  fetchDailySummary,
  fetchLogSummary,
  fetchStreaks,
  fetchCalendar,
  fetchUserInfo,
  fetchActivityList,
  groupDataByWeeks,
  monthlyBreakdownToPoints,
  type MonthlyDataPoint,
  type WeeklyDataPoint,
} from '@/lib/queries/fetchers';
import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import type {
  DailySummary,
  WeeklySummary,
  MonthlySummary,
  StreakData,
  CalendarData,
  CalendarDay,
} from '@/lib/api/dailyLog';
import { getMonthsInWeek } from '@/lib/utils/weekDate';

interface UseHomePageDataOptions {
  profileId?: string;
  logDateFilter: string;
  enabled: boolean;
}

export function useHomePageData({
  profileId,
  logDateFilter,
  enabled,
}: UseHomePageDataOptions) {
  const queryClient = useQueryClient();
  const localDate = DateTime.local().toFormat('yyyy-MM-dd');
  const previousWeekDate = DateTime.local().startOf('week').minus({ weeks: 1 }).toFormat('yyyy-MM-dd');
  const isMonday = DateTime.local().weekday === 1;
  const logDate = DateTime.fromISO(logDateFilter);
  const calendarMonth = logDate.isValid ? logDate.month : DateTime.local().month;
  const calendarYear = logDate.isValid ? logDate.year : DateTime.local().year;

  const weekMonths = useMemo(() => getMonthsInWeek(DateTime.local()), [localDate]);

  const [planQuery, weeklyQuery, monthlyQuery, userQuery, streaksQuery, calendarQuery] =
    useQueries({
      queries: [
        {
          queryKey: queryKeys.weeklyPlan.current(localDate, profileId),
          queryFn: () => fetchCurrentPlan(localDate),
          staleTime: STALE.dashboard,
          enabled,
        },
        {
          queryKey: queryKeys.dailyLog.summary('weekly', localDate, profileId),
          queryFn: () => fetchLogSummary<WeeklySummary>('weekly', localDate),
          staleTime: STALE.dashboard,
          enabled,
        },
        {
          queryKey: queryKeys.dailyLog.summary('monthly', localDate, profileId),
          queryFn: () => fetchLogSummary<MonthlySummary>('monthly', localDate),
          staleTime: STALE.dashboard,
          enabled,
        },
        {
          queryKey: queryKeys.auth.userInfo(profileId),
          queryFn: fetchUserInfo,
          staleTime: STALE.user,
          enabled,
        },
        {
          queryKey: queryKeys.dailyLog.streaks(profileId ?? ''),
          queryFn: () => fetchStreaks(profileId!),
          staleTime: STALE.streaks,
          enabled: enabled && !!profileId,
        },
        {
          queryKey: queryKeys.dailyLog.calendar(profileId ?? '', calendarMonth, calendarYear),
          queryFn: () => fetchCalendar(profileId!, calendarMonth, calendarYear),
          staleTime: STALE.calendar,
          enabled: enabled && !!profileId,
        },
      ],
    });

  const weekCalendarQueries = useQueries({
    queries: weekMonths.map(({ month, year }) => ({
      queryKey: queryKeys.dailyLog.calendar(profileId ?? '', month, year),
      queryFn: () => fetchCalendar(profileId!, month, year),
      staleTime: STALE.calendar,
      enabled: enabled && !!profileId,
    })),
  });

  const weekCalendarDays = useMemo(() => {
    const byDate = new Map<string, CalendarDay>();
    for (const query of weekCalendarQueries) {
      for (const day of query.data?.calendarDays ?? []) {
        byDate.set(day.date.split('T')[0], day);
      }
    }
    return Array.from(byDate.values());
  }, [weekCalendarQueries.map((query) => query.dataUpdatedAt).join('|')]);

  const todayDailyQuery = useQuery({
    queryKey: queryKeys.dailyLog.summary('daily', localDate, profileId),
    queryFn: () => fetchDailySummary(localDate),
    staleTime: STALE.daily,
    enabled,
  });

  const hasPlan = Boolean(planQuery.data);
  const planResolved = planQuery.isSuccess;
  const weeklyResolved = weeklyQuery.isSuccess;
  const currentWeekDaysLogged = weeklyQuery.data?.totalDaysLogged ?? 0;

  // Show last week's score when no active plan yet, or Monday before any logs this week.
  const needsPreviousWeek =
    (planResolved && !hasPlan) ||
    (weeklyResolved && currentWeekDaysLogged === 0 && isMonday);

  const previousWeekQuery = useQuery({
    queryKey: queryKeys.dailyLog.summary('weekly', previousWeekDate, profileId),
    queryFn: () => fetchLogSummary<WeeklySummary>('weekly', previousWeekDate),
    staleTime: STALE.dashboard,
    enabled: enabled && needsPreviousWeek,
  });

  const upcomingPlanQuery = useQuery({
    queryKey: queryKeys.weeklyPlan.upcoming(profileId),
    queryFn: fetchUpcomingPlan,
    staleTime: STALE.dashboard,
    enabled: enabled && planQuery.isSuccess && !hasPlan,
  });

  const selectedDayQuery = useQuery({
    queryKey: queryKeys.dailyLog.summary('daily', logDateFilter, profileId),
    queryFn: () => fetchDailySummary(logDateFilter),
    staleTime: STALE.daily,
    enabled: enabled && !!logDateFilter,
    placeholderData: keepPreviousData,
  });

  const activityListQuery = useQuery({
    queryKey: queryKeys.activities.list(),
    queryFn: fetchActivityList,
    staleTime: STALE.dashboard,
    enabled,
  });

  const summary = needsPreviousWeek
    ? (previousWeekQuery.data ?? null)
    : (weeklyQuery.data ?? null);

  const isShowingPreviousWeek = needsPreviousWeek;

  const monthlyData: MonthlyDataPoint[] = useMemo(() => {
    if (!monthlyQuery.data) return [];
    return monthlyBreakdownToPoints(monthlyQuery.data.dailyBreakdown);
  }, [monthlyQuery.data]);

  const weeklyData: WeeklyDataPoint[] = useMemo(
    () => groupDataByWeeks(monthlyData),
    [monthlyData]
  );

  const noPlanError =
    planQuery.isSuccess && !planQuery.data
      ? 'No active weekly plan found. Create a weekly plan to track your activity goals.'
      : '';

  const isBootstrapping =
    enabled &&
    !planQuery.data &&
    !weeklyQuery.data &&
    !monthlyQuery.data &&
    (planQuery.isPending || weeklyQuery.isPending || monthlyQuery.isPending);

  const isRefreshing =
    enabled &&
    (planQuery.isFetching ||
      weeklyQuery.isFetching ||
      monthlyQuery.isFetching ||
      streaksQuery.isFetching ||
      (needsPreviousWeek && previousWeekQuery.isFetching)) &&
    !isBootstrapping;

  const prefetchDailySummary = (date: string) => {
    if (!enabled) return;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.dailyLog.summary('daily', date, profileId),
      queryFn: () => fetchDailySummary(date),
      staleTime: STALE.daily,
    });
  };

  const prefetchCalendar = (month: number, year: number) => {
    if (!enabled || !profileId) return;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.dailyLog.calendar(profileId, month, year),
      queryFn: () => fetchCalendar(profileId, month, year),
      staleTime: STALE.calendar,
    });
  };

  const invalidateDashboard = () => invalidateDashboardQueries(queryClient);

  return {
    isBootstrapping,
    isRefreshing,
    weeklyPlan: (planQuery.data as WeeklyPlan | null | undefined) ?? null,
    upcomingPlan: (upcomingPlanQuery.data as WeeklyPlan | null | undefined) ?? null,
    noPlanError,
    summary,
    isShowingPreviousWeek,
    dailySummary: (todayDailyQuery.data as DailySummary | null | undefined) ?? null,
    monthlyData,
    weeklyData,
    monthlyLogData: monthlyQuery.data?.totalDaysLogged ?? null,
    streakData: (streaksQuery.data as StreakData | null | undefined) ?? null,
    weeklyLogData: (calendarQuery.data as CalendarData | null | undefined) ?? null,
    weekCalendarDays,
    selectedDayLog: (selectedDayQuery.data as DailySummary | null | undefined) ?? null,
    isDailyLogFetching: selectedDayQuery.isFetching,
    isCalendarFetching: calendarQuery.isFetching,
    userData: userQuery.data ?? null,
    activityList: activityListQuery.data ?? [],
    prefetchDailySummary,
    prefetchCalendar,
    invalidateDashboard,
  };
}
