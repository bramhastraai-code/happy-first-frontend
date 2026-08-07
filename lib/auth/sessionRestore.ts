import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api/apiBaseUrl';
import { getAccessToken, isTokenExpiringSoon, refreshAccessToken } from '@/lib/auth/tokenManager';
import { useAuthStore, type Profile } from '@/lib/store/authStore';

const apiBaseUrl = getApiBaseUrl();

type SessionUser = NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;

function applySessionPayload(payload: {
  accessToken?: string | null;
  user?: SessionUser | null;
  profiles?: Profile[] | null;
}) {
  const store = useAuthStore.getState();
  if (payload.accessToken) {
    store.setAccessToken(payload.accessToken);
  }
  if (payload.user) {
    store.setUser(payload.user);
  }
  if (payload.profiles) {
    store.setProfiles(payload.profiles);
    const selected = store.selectedProfile;
    if (selected) {
      const stillThere = payload.profiles.find((p) => p._id === selected._id);
      if (stillThere) {
        store.setSelectedProfile(stillThere);
      } else if (payload.profiles.length === 1) {
        store.setSelectedProfile(payload.profiles[0]);
      } else {
        store.setSelectedProfile(null);
      }
    } else if (payload.profiles.length === 1) {
      store.setSelectedProfile(payload.profiles[0]);
    }
  }
}

/**
 * Rehydrate auth for PWA / cold starts.
 * Relies on the httpOnly refresh cookie (invisible to JS) when the access
 * cookie or localStorage user was cleared by the browser.
 */
export async function restoreSession(): Promise<{
  authenticated: boolean;
  /** True only when a prior local session existed and the server rejected refresh. */
  sessionExpired: boolean;
}> {
  const store = useAuthStore.getState();
  const tokenBefore = getAccessToken();
  const hadLocalSession = Boolean(tokenBefore || store.user);
  const token = tokenBefore;
  const hasFreshToken = !!token && !isTokenExpiringSoon(token);

  if (hasFreshToken && store.user) {
    return { authenticated: true, sessionExpired: false };
  }

  // Prefer refresh: it renews the access cookie and (when available) returns
  // user + profiles in one round-trip.
  const refreshResult = await refreshAccessToken();
  if (refreshResult.token) {
    applySessionPayload({
      accessToken: refreshResult.token,
      user: refreshResult.user ?? undefined,
      profiles: refreshResult.profiles ?? undefined,
    });

    if (!useAuthStore.getState().user) {
      try {
        const response = await axios.get(`${apiBaseUrl}/userAuth/user-info`, {
          withCredentials: true,
          timeout: 15000,
          headers: {
            Authorization: `Bearer ${refreshResult.token}`,
            'Content-Type': 'application/json',
          },
        });
        const user = response.data?.data as SessionUser | undefined;
        if (user) {
          useAuthStore.getState().setUser(user);
        }
      } catch {
        // Keep the refreshed token; pages can retry user-info.
      }
    }

    return { authenticated: !!useAuthStore.getState().accessToken, sessionExpired: false };
  }

  if (refreshResult.sessionExpired) {
    // No local hint + 401 usually means a logged-out visitor (no refresh cookie).
    // Only treat it as forced logout when we thought we were still signed in.
    return { authenticated: false, sessionExpired: hadLocalSession };
  }

  // Transient refresh failure: keep whatever local session we still have.
  const stillAuthed = !!getAccessToken() && !!useAuthStore.getState().user;
  return { authenticated: stillAuthed, sessionExpired: false };
}
