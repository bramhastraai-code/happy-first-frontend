/** Routes that require login (used by middleware). */
export const PROTECTED_APP_ROUTES = [
  '/home',
  '/tasks',
  '/referral',
  '/community',
  '/feed',
  '/profile-setup',
  '/get-started',
  '/welcome',
  '/select-profile',
  '/settings',
  '/create-plan',
  '/upcoming',
  '/week-analysis',
  '/streak-calendar',
  '/previous-log',
  '/tracker',
  '/coins',
  '/xp',
  '/mood',
] as const;

export const AUTH_ROUTES = ['/login', '/register', '/verify-otp'] as const;
