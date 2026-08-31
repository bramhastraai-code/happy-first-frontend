import { Step } from 'react-joyride';

/**
 * Home (Happiness) tour — walks the current dashboard top to bottom.
 */
export const homeTourSteps: Step[] = [
  {
    target: '.welcome-banner',
    title: 'Your Happiness home',
    content:
      'Greeting, profile photo, plan status, alerts, and chat. Switch profiles here when you manage family members.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.home-search',
    title: 'Search',
    content:
      'Find people, communities, events, and tasks without leaving Happiness.',
    placement: 'bottom',
  },
  {
    target: '.home-category-cards',
    title: 'Body, Mind & Soul',
    content:
      'See today’s logged vs remaining activities in each category. Tap a card to jump into Tasks for that group.',
    placement: 'bottom',
  },
  {
    target: '.log-today-cta',
    title: "Log today's activities",
    content:
      'Opens Tasks so you can enter Mind, Body, and Soul values from your weekly plan. Submit after 6 PM to keep your streak.',
    placement: 'bottom',
  },
  {
    target: '.create-plan-fab',
    title: 'Create a plan',
    content:
      'This button on the bottom-right opens Create Plan — pick activities, set weekly targets, and start (or refresh) your week.',
    placement: 'top',
    isFixed: true,
    disableScrolling: true,
  },
  {
    target: '.xp-coins-grid',
    title: 'XP & Happy Coins',
    content:
      'Tap XP for your level and daily goal, or Coins for balance and rewards. Logging consistently grows both.',
    placement: 'bottom',
  },
  {
    target: '.home-motivation',
    title: 'Daily motivation',
    content:
      'A short happiness line for today. The same affirmation can also appear as a once-a-day popup.',
    placement: 'bottom',
  },
  {
    target: '.week-tracker',
    title: 'This week',
    content:
      'Fire icons light up on days you’ve logged (in your mascot colour). Tap a day to open it in the daily log tracker below.',
    placement: 'bottom',
  },
  {
    target: '.stats-grid',
    title: 'Streak & week score',
    content:
      'Current streak and days logged on the left; this week’s consistency score on the right. Open the streak calendar for the full heatmap.',
    placement: 'top',
  },
  {
    target: '.pending-activities',
    title: 'Pending activities',
    content:
      'What’s still open on your plan — daily goals and weekly progress. Expand this section anytime to see leftovers.',
    placement: 'top',
  },
  {
    target: '.weekly-performance',
    title: 'Monthly performance',
    content:
      'Week view shows consistency by week; Day view is a daily score line. Bars follow your theme colour. Tap a bar to open that week or day.',
    placement: 'top',
  },
  {
    target: '.leaderboard-section',
    title: 'Weekly consistency leaderboard',
    content:
      'Compare your weekly % with others for the selected week. Use the arrows to look at past weeks.',
    placement: 'top',
  },
  {
    target: '.log-tracker',
    title: 'Daily log tracker',
    content:
      'Browse months, pick a date, review what you logged, or submit a missing day.',
    placement: 'top',
  },
  {
    target: '#home-social',
    title: 'My social',
    content:
      'A peek at Inspiration — posts from people you follow. Open Inspiration in the bottom bar for the full feed, stories, and create.',
    placement: 'top',
  },
  {
    target: '#home-community',
    title: 'My community',
    content:
      'Communities you belong to. Open Community to discover groups, scan invite QR codes, chat, and track group goals.',
    placement: 'top',
  },
  {
    target: '.bottom-nav',
    title: 'Main navigation',
    content:
      'Inspiration (feed & messages) · Happiness (home & tasks) · Community (groups) · Profile (settings, family, referrals, theme).',
    placement: 'top',
    isFixed: true,
    disableScrolling: true,
  },
];

/**
 * Tasks tour — daily logging flow.
 */
export const tasksTourSteps: Step[] = [
  {
    target: '.tasks-header',
    title: "Today's log",
    content:
      'Log Mind, Body, and Soul from your active weekly plan. Use Edit plan in the header when you need to adjust targets.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.tasks-progress',
    title: "Today's progress",
    content:
      'See how many activities you’ve completed and how close you are to finishing today’s log.',
    placement: 'bottom',
  },
  {
    target: '.tasks-quick-links',
    title: 'Plan & missed days',
    content:
      'Open your upcoming week’s plan, or jump to previous logs to backfill a missed day.',
    placement: 'bottom',
  },
  {
    target: '.weekly-activities',
    title: 'Enter activities',
    content:
      'Fill in each activity value. Community-only activities appear here too when you’re in a group with targets.',
    placement: 'top',
  },
  {
    target: '.create-plan-fab',
    title: 'Create a plan',
    content:
      'Need a new week of activities? This bottom-right button opens Create Plan so you can set targets and start logging.',
    placement: 'top',
    isFixed: true,
    disableScrolling: true,
  },
  {
    target: '.submit-log-button',
    title: 'Submit log',
    content:
      'Submit after 6 PM once values are entered. After a successful log you’ll see the fire celebration in your theme colour.',
    placement: 'top',
  },
  {
    target: '.bottom-nav',
    title: 'Main navigation',
    content:
      'Inspiration · Happiness · Community · Profile — use these anytime to move around the app.',
    placement: 'top',
    isFixed: true,
    disableScrolling: true,
  },
];
