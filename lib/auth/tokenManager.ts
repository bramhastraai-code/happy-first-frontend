import axios from 'axios';
import { getCookie, useAuthStore } from '@/lib/store/authStore';
import { isTokenExpiringSoon } from '@/lib/auth/jwt';
import { getApiBaseUrl } from '@/lib/api/apiBaseUrl';

const apiBaseUrl = getApiBaseUrl();

export interface RefreshResult {
  token: string | null;
  /**
   * True only when the server explicitly rejected the refresh token (401/403).
   * Network errors, timeouts, and 5xx responses keep the session alive.
   */
  sessionExpired: boolean;
}

let refreshPromise: Promise<RefreshResult> | null = null;

export { isTokenExpiringSoon } from '@/lib/auth/jwt';

export function getAccessToken(): string | null {
  const fromStore = useAuthStore.getState().accessToken;
  if (fromStore) return fromStore;
  return getCookie('accessToken');
}

export function syncAccessTokenFromCookie(): string | null {
  const token = getCookie('accessToken');
  const store = useAuthStore.getState();
  if (token && token !== store.accessToken) {
    store.setAccessToken(token);
  }
  if (!token && store.accessToken) {
    store.setAccessToken(null);
  }
  return token;
}

export async function refreshAccessToken(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async (): Promise<RefreshResult> => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/userAuth/refresh`,
        {},
        {
          withCredentials: true,
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const accessToken = response.data?.data?.accessToken as string | undefined;
      if (!accessToken) {
        // Treat a malformed success response as transient, not as a dead session.
        return { token: null, sessionExpired: false };
      }

      useAuthStore.getState().setAccessToken(accessToken);
      return { token: accessToken, sessionExpired: false };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      return { token: null, sessionExpired: status === 401 || status === 403 };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function ensureValidAccessToken(): Promise<string | null> {
  syncAccessTokenFromCookie();
  const token = getAccessToken();
  // The token may be missing entirely (e.g. app reopened after the access
  // token expired) while the httpOnly refresh cookie is still valid, so
  // always try to refresh rather than bailing out early.
  if (token && !isTokenExpiringSoon(token)) return token;

  const { token: refreshed } = await refreshAccessToken();
  return refreshed ?? token;
}

export function clearRefreshQueue(): void {
  refreshPromise = null;
}
