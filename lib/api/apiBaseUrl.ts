/** Same-origin API path — proxied to the backend via next.config rewrites. */
const PROXY_API_BASE = '/api/v1';

/**
 * Base URL for browser and client-side API calls.
 * Defaults to the local Next.js proxy (`/api/v1`) to avoid CORS.
 * Set `NEXT_PUBLIC_API_BASE_URL` only if you need a direct backend URL.
 */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return PROXY_API_BASE;
}

export { PROXY_API_BASE };
