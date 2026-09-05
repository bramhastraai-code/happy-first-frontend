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
      'Open Explore to find people and posts. Same Search control as Social.',
    placement: 'bottom',
  },
  {
    target: '.home-mood',
    title: 'Select mood',
    content:
      'Tap to check in how you feel. Use Mood page in the sheet for history, photos, and settings.',
    placement: 'bottom',
  },
  {
    target: '.home-category-cards',
    title: 'Body, Mind & Soul',
    content:
      'Weekly achievement for each category — how much of your plan you have completed so far this week.',
    placement: 'bottom',
  },
  {
    target: '.pending-activities',
    title: 'Pending activities',
    content:
      'What’s still open on your plan — the badge shows the total count. Expand anytime to see leftovers.',
    placement: 'top',
  },
  {
    target: '.log-tracker',
    title: 'Daily log',
    content:
      'Your named daily log — browse the calendar, pick a date, review what you logged, or submit a missing day.',
    placement: 'top',
  },
  {
    target: '.home-streak',
    title: 'Streak',
    content:
      'Current streak and total days logged. Tap to open your full streak calendar.',
    placement: 'bottom',
  },
  {
    target: '.xp-coins-grid',
    title: 'Coins & XP',
    content:
      'Coins and XP in a simple row — tap through to Coins or XP. Your level sits next to your name in the header.',
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
    target: '.leaderboard-section',
    title: 'Weekly consistency leaderboard',
    content:
      'Compare your weekly % with others for the selected week. Use the arrows to look at past weeks.',
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
    target: '.create-plan-fab',
    title: 'Create a plan',
    content:
      'This button on the bottom-right opens Create Plan — pick activities, set weekly targets, and start (or refresh) your week.',
    placement: 'top',
    isFixed: true,
    disableScrolling: true,
  },
  {
    target: '.bottom-nav',
    title: 'Main navigation',
    content:
      'Social (feed & messages) · Happiness (home & tasks) · Club (groups) · Profile (settings, family, referrals, theme).',
    placement: 'top',
    isFixed: true,
    disableScrolling: true,
  },
];

export const communityTourSteps: Step[] = [
  {
    target: '.community-page-header',
    title: 'Communities',
    content: 'Browse groups you belong to, discover new ones, and create your own.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.community-create-btn',
    title: 'Create a community',
    content: 'Set activities & levels, or choose discussion-only with No targets.',
    placement: 'left',
    isFixed: true,
  },
  {
    target: '.bottom-nav',
    title: 'Navigation',
    content: 'Switch between Social, Happiness, Club, and Profile anytime.',
    placement: 'top',
    isFixed: true,
  },
];

export const xpTourSteps: Step[] = [
  {
    target: '.xp-hero',
    title: 'Your XP standing',
    content: 'Lifetime XP, current level, daily goal, and progress to the next level.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.xp-levels-section',
    title: 'Level table',
    content: 'All 20 levels with XP thresholds — tap any row to see members at that level.',
    placement: 'top',
  },
  {
    target: '.xp-sources-section',
    title: 'XP sources',
    content: 'See which activities contribute most to your lifetime XP.',
    placement: 'top',
  },
];

export const settingsTourSteps: Step[] = [
  {
    target: '.settings-header',
    title: 'Profile & settings',
    content: 'Manage your profile, family members, reminders, and app preferences.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.settings-theme-landing',
    title: 'Theme & landing',
    content: 'Pick mascot colour and which page opens after you log in.',
    placement: 'top',
  },
  {
    target: '.bottom-nav',
    title: 'Main navigation',
    content: 'Return to Happiness home or any main section from here.',
    placement: 'top',
    isFixed: true,
  },
];

export const feedTourSteps: Step[] = [
  {
    target: '.feed-header',
    title: 'Social feed',
    content: 'Posts from people you follow — like, comment, and share motivation.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.feed-compose',
    title: 'Share a post',
    content: 'Upload a photo or video to inspire your community.',
    placement: 'bottom',
  },
  {
    target: '.bottom-nav',
    title: 'Navigation',
    content: 'Use the bottom bar to move between main modules.',
    placement: 'top',
    isFixed: true,
  },
];

export const coinsTourSteps: Step[] = [
  {
    target: '.coins-balance',
    title: 'Happy First Coins',
    content: 'Earn coins when you log activities — one coin per activity logged each day.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.coins-history',
    title: 'Coin history',
    content: 'Daily totals grouped by date so you can track consistency.',
    placement: 'top',
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
      'Social · Happiness · Club · Profile — use these anytime to move around the app.',
    placement: 'top',
    isFixed: true,
    disableScrolling: true,
  },
];
