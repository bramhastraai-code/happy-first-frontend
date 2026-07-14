import type { QueryClient } from '@tanstack/react-query';

export const trackerRootKey = ['tracker'] as const;

/** Shared React Query options for tracker data — overrides app-wide refetchOnWindowFocus: false */
export const trackerQueryOptions = {
  refetchOnWindowFocus: true,
  refetchOnMount: true,
  refetchOnReconnect: true,
  staleTime: 5_000,
} as const;

export async function invalidateAllTrackerQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: trackerRootKey });
}

export async function refetchAllTrackerQueries(queryClient: QueryClient) {
  await queryClient.refetchQueries({ queryKey: trackerRootKey, type: 'active' });
}
