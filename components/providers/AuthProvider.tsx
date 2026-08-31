'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ensureValidAccessToken,
  getAccessToken,
  isTokenExpiringSoon,
  syncAccessTokenFromCookie,
} from '@/lib/auth/tokenManager';
import { restoreSession } from '@/lib/auth/sessionRestore';
import { performLogout } from '@/lib/auth/session';
import { useNotificationRealtime } from '@/lib/hooks/useNotificationRealtime';
import { useFcmForegroundNotifications } from '@/lib/hooks/useFcmForegroundNotifications';

const TOKEN_CHECK_INTERVAL_MS = 60_000;

function NotificationRealtimeBridge() {
  useNotificationRealtime();
  useFcmForegroundNotifications();
  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isHydrated, accessToken, user, sessionReady, setSessionReady } = useAuthStore();
  const checkingRef = useRef(false);
  const bootstrappedRef = useRef(false);

  // Cold-start / PWA reopen: restore from refresh cookie even if localStorage
  // user or the JS accessToken cookie was cleared.
  useEffect(() => {
    if (!isHydrated || bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let cancelled = false;

    const bootstrap = async () => {
      syncAccessTokenFromCookie();
      try {
        const { authenticated, sessionExpired } = await restoreSession();
        if (cancelled) return;

        if (!authenticated && sessionExpired) {
          await performLogout();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, setSessionReady]);

  useEffect(() => {
    if (!isHydrated || !sessionReady) return;

    const checkToken = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        syncAccessTokenFromCookie();
        const token = getAccessToken();
        const { user: currentUser } = useAuthStore.getState();

        // Boot already attempted a cookie-only restore. Skip anonymous polling
        // so logged-out users don't hit /refresh every minute.
        if (!currentUser && !token) return;

        if (!token || isTokenExpiringSoon(token) || !currentUser) {
          const { authenticated, sessionExpired } = await restoreSession();
          if (!authenticated && sessionExpired) {
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
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkToken();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isHydrated, sessionReady, accessToken, user]);

  return (
    <>
      <NotificationRealtimeBridge />
      {children}
    </>
  );
}
