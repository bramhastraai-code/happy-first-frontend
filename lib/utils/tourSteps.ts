import { Step } from 'react-joyride';

export const homeTourSteps: Step[] = [
  {
    target: '.welcome-banner',
    title: 'Your dashboard',
    content: 'See your name, profile switcher, and account actions here.',
    disableBeacon: true,
  },
  {
    target: '.week-tracker',
    title: 'This week',
    content: 'Tap any day to open that date in the daily log tracker below.',
  },
  {
    target: '.stats-grid',
    title: 'Streak & score',
    content: 'Track your current streak and weekly points at a glance.',
  },
  {
    target: '.weekly-performance',
    title: 'Monthly performance',
    content: 'Review your activity chart. Switch between day and week views.',
  },
  {
    target: '.pending-activities',
    title: 'Pending tasks',
    content: 'Activities still open today from your weekly plan.',
  },
  {
    target: '.leaderboard-section',
    title: 'Leaderboard',
    content: 'See how you rank against others this week.',
  },
  {
    target: '.log-tracker',
    title: 'Daily log tracker',
    content: 'Pick a date and review what you logged that day.',
  },
  {
    target: '.bottom-nav',
    title: 'Navigation',
    content: 'Jump between Home, Tasks, Plan, Referrals, and Community.',
  },
];

export const tasksTourSteps: Step[] = [
  {
    target: '.tasks-header',
    title: 'Daily tasks',
    content: "Log today's activities from your weekly plan.",
    disableBeacon: true,
  },
  {
    target: '.tasks-progress',
    title: "Today's progress",
    content: "See how many activities you've completed so far today.",
  },
  {
    target: '.tasks-quick-links',
    title: 'Quick links',
    content: "Open your upcoming plan or submit yesterday's missed log.",
  },
  {
    target: '.weekly-activities',
    title: 'Log activities',
    content: 'Enter values for each activity, grouped by Mind, Body, and Soul.',
  },
  {
    target: '.submit-log-button',
    title: 'Submit log',
    content: 'Submit after 6 PM once all values are entered.',
  },
  {
    target: '.bottom-nav',
    title: 'Navigation',
    content: 'Use the bottom bar to move to other sections.',
  },
];
