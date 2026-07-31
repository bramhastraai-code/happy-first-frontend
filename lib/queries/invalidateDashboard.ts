import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate all home-dashboard queries (score, streak, calendar flames, plan).
 * Uses refetchType 'all' so cached queries on other pages (e.g. the home
 * "This week" widget while submitting from /tasks) refetch immediately in the
 * background instead of waiting until the page is revisited.
 */
export async function invalidateDashboardQueries(queryClient: QueryClient) {
  // Fire-and-forget: mark stale + kick off refetches without blocking the
  // caller (e.g. the submit success overlay should appear immediately).
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: ['weeklyPlan'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['dailyLog'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['auth', 'userInfo'], refetchType: 'all' }),
  ]).catch(() => {});
}
