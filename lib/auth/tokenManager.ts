import axios from 'axios';
import { getCookie, useAuthStore } from '@/lib/store/authStore';
import { isTokenExpiringSoon } from '@/lib/auth/jwt';
import { getApiBaseUrl } from '@/lib/api/apiBaseUrl';

const apiBaseUrl = getApiBaseUrl();

let refreshPromise: Promise<string | null> | null = null;

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

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
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
        throw new Error('Refresh response missing access token');
      }

      useAuthStore.getState().setAccessToken(accessToken);
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function ensureValidAccessToken(): Promise<string | null> {
  syncAccessTokenFromCookie();
  const token = getAccessToken();
  if (!token) return null;
  if (!isTokenExpiringSoon(token)) return token;

  const refreshed = await refreshAccessToken();
  return refreshed ?? token;
}

export function clearRefreshQueue(): void {
  refreshPromise = null;
}
