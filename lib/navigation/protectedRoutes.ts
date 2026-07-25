/** Routes that require login (used by middleware). */
export const PROTECTED_APP_ROUTES = [
  '/home',
  '/tasks',
  '/referral',
  '/community',
  '/feed',
  '/profile-setup',
  '/select-profile',
  '/settings',
  '/create-plan',
  '/upcoming',
  '/week-analysis',
  '/streak-calendar',
  '/previous-log',
  '/tracker',
] as const;

export const AUTH_ROUTES = ['/login', '/register', '/verify-otp'] as const;
