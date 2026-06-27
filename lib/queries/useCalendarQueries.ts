'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys, STALE } from '@/lib/queries/keys';
import {
  fetchStreaks,
  fetchCalendar,
  fetchActivityCalendar,
} from '@/lib/queries/fetchers';

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
  enabled = true
) {
  const isActivity = filterType === 'activity' && !!activityId;

  return useQuery({
    queryKey: isActivity
      ? queryKeys.dailyLog.activityCalendar(profileId ?? '', activityId, month, year)
      : queryKeys.dailyLog.calendar(profileId ?? '', month, year),
    queryFn: () =>
      isActivity
        ? fetchActivityCalendar(profileId!, activityId, month, year)
        : fetchCalendar(profileId!, month, year),
    staleTime: STALE.calendar,
    enabled: enabled && !!profileId && (filterType === 'overall' || !!activityId),
    placeholderData: keepPreviousData,
  });
}
