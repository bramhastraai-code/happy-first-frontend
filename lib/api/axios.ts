import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ensureValidAccessToken,
  getAccessToken,
  refreshAccessToken,
  syncAccessTokenFromCookie,
} from '@/lib/auth/tokenManager';
import { performLogout } from '@/lib/auth/session';
import { getApiBaseUrl } from '@/lib/api/apiBaseUrl';

const apiBaseUrl = getApiBaseUrl();

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_NETWORK_RETRIES = 2;
const MAX_RATE_LIMIT_RETRIES = 3;

const AUTH_PATHS = [
  '/userAuth/login',
  '/userAuth/register',
  '/userAuth/verify-otp',
  '/userAuth/req-login-otp',
  '/userAuth/login-otp-verify',
  '/userAuth/resend-otp',
  '/userAuth/forgot-password',
  '/userAuth/refresh',
  '/userAuth/logout',
  '/userAuth/magic-link',
];

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _networkRetryCount?: number;
  _rateLimitRetryCount?: number;
};

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return AUTH_PATHS.some((path) => url.includes(path));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(error: AxiosError, attempt: number): number {
  const retryAfterHeader = error.response?.headers?.['retry-after'];
  if (retryAfterHeader) {
    const seconds = Number.parseInt(String(retryAfterHeader), 10);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

function isNetworkError(error: AxiosError): boolean {
  return (
    !error.response &&
    (error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.message.toLowerCase().includes('network'))
  );
}

function isIdempotentMethod(method?: string): boolean {
  const verb = (method ?? 'get').toLowerCase();
  return verb === 'get' || verb === 'head' || verb === 'options';
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    syncAccessTokenFromCookie();

    if (!isAuthEndpoint(config.url)) {
      const token = await ensureValidAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    const { selectedProfile } = useAuthStore.getState();
    if (selectedProfile) {
      config.params = { ...config.params, profile: selectedProfile._id };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;

    if (status === 429) {
      const shouldRetry429 =
        !isAuthEndpoint(originalRequest.url) &&
        (originalRequest._rateLimitRetryCount ?? 0) < MAX_RATE_LIMIT_RETRIES;
      if (shouldRetry429) {
        const count = originalRequest._rateLimitRetryCount ?? 0;
        originalRequest._rateLimitRetryCount = count + 1;
        await sleep(getRetryDelayMs(error, count));
        return api(originalRequest);
      }
    }

    if (isNetworkError(error) && isIdempotentMethod(originalRequest.method)) {
      const count = originalRequest._networkRetryCount ?? 0;
      if (count < MAX_NETWORK_RETRIES) {
        originalRequest._networkRetryCount = count + 1;
        await sleep(getRetryDelayMs(error, count));
        return api(originalRequest);
      }
    }

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      await performLogout();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
