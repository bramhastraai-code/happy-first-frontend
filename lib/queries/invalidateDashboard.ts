import type { QueryClient } from '@tanstack/react-query';

/** Invalidate all home-dashboard queries (score, streak, calendar flames, plan). */
export async function invalidateDashboardQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] }),
    queryClient.invalidateQueries({ queryKey: ['dailyLog'] }),
    queryClient.invalidateQueries({ queryKey: ['auth', 'userInfo'] }),
  ]);
}
