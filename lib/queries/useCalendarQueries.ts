'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys, STALE } from '@/lib/queries/keys';
import {
  fetchStreaks,
  fetchCalendar,
  fetchActivityCalendar,
  fetchAllTimeLeaderboard,
} from '@/lib/queries/fetchers';
import type { ActivityCalendarData, CalendarData } from '@/lib/api/dailyLog';

type FilterType = 'overall' | 'activity';

export function useStreakData(profileId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dailyLog.streaks(profileId ?? ''),
    queryFn: () => fetchStreaks(profileId!),
    staleTime: STALE.streaks,
    enabled: enabled && !!profileId,
  });
}

export function useCalendarData(
  profileId: string | undefined,
  month: number,
  year: number,
  filterType: FilterType,
  activityId: string,
  leaderboardPage: number,
  allTimeLeaderboardPage: number,
  enabled = true
) {
  const isActivity = filterType === 'activity' && !!activityId;

  return useQuery({
    queryKey: isActivity
      ? queryKeys.dailyLog.activityCalendar(
          profileId ?? '',
          activityId,
          month,
          year,
          leaderboardPage,
          allTimeLeaderboardPage
        )
      : queryKeys.dailyLog.calendar(
          profileId ?? '',
          month,
          year,
          leaderboardPage,
          allTimeLeaderboardPage
        ),
    queryFn: (): Promise<CalendarData | ActivityCalendarData> =>
      isActivity
        ? fetchActivityCalendar(
            profileId!,
            activityId,
            month,
            year,
            leaderboardPage,
            allTimeLeaderboardPage,
            { includeAllTimeLeaderboard: false }
          )
        : fetchCalendar(
            profileId!,
            month,
            year,
            leaderboardPage,
            allTimeLeaderboardPage,
            { includeAllTimeLeaderboard: false }
          ),
    staleTime: STALE.calendar,
    enabled: enabled && !!profileId && (filterType === 'overall' || !!activityId),
    placeholderData: keepPreviousData,
  });
}

export function useAllTimeLeaderboard(
  profileId: string | undefined,
  page: number,
  activityId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.dailyLog.calendarLeaderboardAllTime(profileId ?? '', page, activityId),
    queryFn: () => fetchAllTimeLeaderboard(profileId!, page, activityId),
    staleTime: STALE.calendar,
    enabled: enabled && !!profileId,
    placeholderData: keepPreviousData,
  });
}

export function prefetchCalendarMonth(
  queryClient: import('@tanstack/react-query').QueryClient,
  profileId: string,
  month: number,
  year: number,
  filterType: FilterType,
  activityId: string
) {
  const isActivity = filterType === 'activity' && !!activityId;
  const queryKey = isActivity
    ? queryKeys.dailyLog.activityCalendar(profileId, activityId, month, year, 1, 1)
    : queryKeys.dailyLog.calendar(profileId, month, year, 1, 1);

  return queryClient.prefetchQuery({
    queryKey,
    queryFn: (): Promise<CalendarData | ActivityCalendarData> =>
      isActivity
        ? fetchActivityCalendar(profileId, activityId, month, year, 1, 1, {
            includeAllTimeLeaderboard: false,
          })
        : fetchCalendar(profileId, month, year, 1, 1, {
            includeAllTimeLeaderboard: false,
          }),
    staleTime: STALE.calendar,
  });
}
