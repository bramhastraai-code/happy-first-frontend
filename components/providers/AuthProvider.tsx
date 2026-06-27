'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ensureValidAccessToken,
  getAccessToken,
  isTokenExpiringSoon,
  refreshAccessToken,
  syncAccessTokenFromCookie,
} from '@/lib/auth/tokenManager';
import { performLogout } from '@/lib/auth/session';

const TOKEN_CHECK_INTERVAL_MS = 60_000;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isHydrated, accessToken, user } = useAuthStore();
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;

    syncAccessTokenFromCookie();

    const checkToken = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        const token = getAccessToken();
        if (!token || !user) return;

        if (isTokenExpiringSoon(token)) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            await performLogout();
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              window.location.href = '/login';
            }
          }
        } else {
          await ensureValidAccessToken();
        }
      } finally {
        checkingRef.current = false;
      }
    };

    void checkToken();
    const intervalId = window.setInterval(() => {
      void checkToken();
    }, TOKEN_CHECK_INTERVAL_MS);

    const onFocus = () => {
      void checkToken();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [isHydrated, accessToken, user]);

  return <>{children}</>;
}
