/**
 * Guided “steps to use the platform” across all modules.
 * Update step copy here when product/content owners revise the how-to.
 */
export type PlatformStep = {
  id: string;
  step: number;
  title: string;
  body: string;
  href: string;
  cta: string;
};

export const PLATFORM_HOW_TO_INTRO = {
  title: 'Steps to use Happy First',
  subtitle:
    'A simple path through every module — from daily happiness to community, social, coins, and your profile.',
};

export const PLATFORM_STEPS: PlatformStep[] = [
  {
    id: 'home',
    step: 1,
    title: 'Happiness (Home)',
    body: 'Start here for motivation, today’s tasks shortcut, XP & coins, weekly tracker, and your happiness dashboard.',
    href: '/home',
    cta: 'Open Home',
  },
  {
    id: 'tasks',
    step: 2,
    title: 'Log today’s tasks',
    body: 'Enter Mind, Body, and Soul activities from your weekly plan. Submit after 6 PM to keep your streak.',
    href: '/tasks',
    cta: 'Open Tasks',
  },
  {
    id: 'plan',
    step: 3,
    title: 'Create your weekly plan',
    body: 'Set activities and targets for the week so Home and Tasks know what to track.',
    href: '/create-plan',
    cta: 'Create plan',
  },
  {
    id: 'inspiration',
    step: 4,
    title: 'Inspiration (Social)',
    body: 'Share photos, videos, or text posts, follow people, react with Happy Coins, and message friends.',
    href: '/feed',
    cta: 'Open Inspiration',
  },
  {
    id: 'community',
    step: 5,
    title: 'Community',
    body: 'Join or create communities, chat, track group goals, and Discover new groups for inspiration.',
    href: '/community',
    cta: 'Open Community',
  },
  {
    id: 'xp',
    step: 6,
    title: 'XP & levels',
    body: 'Earn XP from consistent logging and intensity. Check your level and daily XP goal.',
    href: '/xp',
    cta: 'Open XP',
  },
  {
    id: 'coins',
    step: 7,
    title: 'Happy Coins',
    body: 'See your balance, how you earned coins, and redeem rewards. Gift reactions also use coins.',
    href: '/coins',
    cta: 'Open Coins',
  },
  {
    id: 'streak',
    step: 8,
    title: 'Streak calendar',
    body: 'See which days you logged this month and protect your streak.',
    href: '/streak-calendar',
    cta: 'Open calendar',
  },
  {
    id: 'tracker',
    step: 9,
    title: 'Fitness tracker',
    body: 'Record GPS workouts, maps, and goals when you want movement beyond daily logs.',
    href: '/tracker',
    cta: 'Open tracker',
  },
  {
    id: 'profile',
    step: 10,
    title: 'My Profile',
    body: 'Edit your lifestyle profile, reminders, default landing page, and referrals — all under Profile.',
    href: '/settings',
    cta: 'Open Profile',
  },
  {
    id: 'referral',
    step: 11,
    title: 'Refer friends',
    body: 'Invite friends from Profile → Refer friends and earn Happy Coins when they join.',
    href: '/referral',
    cta: 'Open referrals',
  },
];
