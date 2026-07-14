'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAllTrackerQueries } from '@/lib/tracker/hooks/trackerQueries';

export default function TrackerAutoRefresh() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname?.startsWith('/tracker')) return;
    if (pathname.startsWith('/tracker/live')) return;

    const pathChanged = lastPathRef.current !== pathname;
    lastPathRef.current = pathname;

    if (pathChanged) {
      void invalidateAllTrackerQueries(queryClient);
    }
  }, [pathname, queryClient]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      const path = window.location.pathname;
      if (!path.startsWith('/tracker') || path.startsWith('/tracker/live')) return;
      void invalidateAllTrackerQueries(queryClient);
    };

    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [queryClient]);

  return null;
}
