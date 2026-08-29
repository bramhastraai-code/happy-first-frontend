import { Step } from 'react-joyride';

/**
 * Home (Happiness) tour — mirrors the current dashboard layout and features.
 */
export const homeTourSteps: Step[] = [
  {
    target: '.welcome-banner',
    title: 'Your Happiness home',
    content:
      'Greeting, profile photo, and account actions. Open Settings for profile, family, reminders, and referrals — or switch profiles when you manage family members.',
    disableBeacon: true,
  },
  {
    target: '.log-today-cta',
    title: "Log today's activities",
    content:
      'Jump to Tasks to enter Mind, Body, and Soul values from your weekly plan. Submit after 6 PM to keep your streak and earn points.',
  },
  {
    target: '.xp-coins-grid',
    title: 'XP & Happy Coins',
    content:
      'Tap XP for your level and daily goal, or Coins for balance, history, and rewards. Logging consistently grows both.',
  },
  {
    target: '.week-tracker',
    title: 'This week',
    content:
      'See which days you’ve logged. Tap a day to open it in the daily log tracker further down.',
  },
  {
    target: '.stats-grid',
    title: 'Streak & week score',
    content:
      'Current streak and days logged on the left; this week’s consistency score on the right. Open the streak calendar for the full heatmap.',
  },
  {
    target: '.pending-activities',
    title: 'Pending activities',
    content:
      'Open tasks still left from your plan — daily goals and weekly progress in one place.',
  },
  {
    target: '.weekly-performance',
    title: 'Monthly performance',
    content:
      'Week view shows consistency by week; switch to Day for a daily score line. Tap a bar to dig into that week or day.',
  },
  {
    target: '.leaderboard-section',
    title: 'Weekly Consistency Leaderboard',
    content:
      'Compare your weekly % with others. Change the week with the arrows to see past rankings.',
  },
  {
    target: '.log-tracker',
    title: 'Daily log tracker',
    content:
      'Browse months, pick a date, review what you logged, or submit a missing day.',
  },
  {
    target: '#home-social',
    title: 'My social',
    content:
      'A peek at Inspiration — posts from people you follow. Open Inspiration from the bottom bar for the full feed, stories, messages, and create.',
  },
  {
    target: '#home-community',
    title: 'My community',
    content:
      'Communities you belong to. Open Community to discover groups, scan invite QR codes, chat, and track group goals.',
  },
  {
    target: '.bottom-nav',
    title: 'Main navigation',
    content:
      'Inspiration (feed & messages) · Happiness (home & tasks) · Community (groups & QR join) · Profile (settings, family, referrals, reminders).',
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
      'Log Mind, Body, and Soul activities from your active weekly plan. Edit the plan from here when you need to adjust targets.',
    disableBeacon: true,
  },
  {
    target: '.tasks-progress',
    title: "Today's progress",
    content:
      'See how many activities you’ve completed and how close you are to finishing today’s log.',
  },
  {
    target: '.tasks-quick-links',
    title: 'Plan & missed days',
    content:
      'Open your upcoming week’s plan, or jump to previous logs to backfill a missed day.',
  },
  {
    target: '.weekly-activities',
    title: 'Enter activities',
    content:
      'Fill in each activity value. Community-only activities appear here too when you’re in a group with targets.',
  },
  {
    target: '.submit-log-button',
    title: 'Submit log',
    content:
      'Submit after 6 PM once values are entered. Early submit may be blocked so your day can finish first.',
  },
  {
    target: '.bottom-nav',
    title: 'Main navigation',
    content:
      'Inspiration · Happiness · Community · Profile — use these anytime to move around the app.',
  },
];
