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
import { useNotificationRealtime } from '@/lib/hooks/useNotificationRealtime';

const TOKEN_CHECK_INTERVAL_MS = 60_000;

function NotificationRealtimeBridge() {
  useNotificationRealtime();
  return null;
}

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
        if (!user) return;

        const token = getAccessToken();
        // Refresh when the token is missing (e.g. app reopened after it
        // expired) or about to expire; the refresh cookie decides whether
        // the session is still alive.
        if (!token || isTokenExpiringSoon(token)) {
          const { token: refreshed, sessionExpired } = await refreshAccessToken();
          if (!refreshed && sessionExpired) {
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

  return (
    <>
      <NotificationRealtimeBridge />
      {children}
    </>
  );
}
