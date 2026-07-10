import { AUTH_ROUTES, PROTECTED_APP_ROUTES } from '@/lib/navigation/protectedRoutes';

/** Routes that should not appear in search results or the public sitemap. */
export const NO_INDEX_ROUTES = [
  ...PROTECTED_APP_ROUTES,
  ...AUTH_ROUTES,
  '/magic-link',
  '/forgot-password',
] as const;

/** Paths for robots.txt disallow rules (includes nested routes). */
export const ROBOTS_DISALLOW_PATHS = [
  ...NO_INDEX_ROUTES,
  '/magic-link/',
] as const;
