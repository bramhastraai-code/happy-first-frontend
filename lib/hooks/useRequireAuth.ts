'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

/**
 * Wait for hydration + session restore before deciding the user is logged out.
 * Prevents PWA cold starts from bouncing to /login while refresh is in flight.
 */
export function useRequireAuth(options?: { requireUser?: boolean }) {
  const router = useRouter();
  const requireUser = options?.requireUser ?? true;
  const { isHydrated, sessionReady, accessToken, user } = useAuthStore();
  const ready = isHydrated && sessionReady;
  const authenticated = requireUser ? Boolean(accessToken && user) : Boolean(accessToken);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.push('/login');
    }
  }, [ready, authenticated, router]);

  return {
    ready,
    authenticated,
    isChecking: !ready,
  };
}
