import { Step } from 'react-joyride';

// Home Page Tour
export const homeTourSteps: Step[] = [
  {
    target: '.welcome-banner',
    content: 'Welcome! This shows your current profile and points. Click here to see your profile details.',
    disableBeacon: true,
  },
  {
    target: '.profile-switcher',
    content: 'Switch between different family member profiles here. Perfect for managing multiple users!',
  },
  {
    target: '.stats-grid',
    content: "View your daily and weekly scores here. Track your progress at a glance!",
  },
  {
    target: '.weekly-performance',
    content: 'Track your performance here. Click on any bar in the graph to see detailed logs for that specific day or week!',
  },
  {
    target: '.activity-goals',
    content: 'View your weekly activity goals and track completion progress.',
  },
  {
    target: '.pending-activities',
    content: 'Your pending activities for today are shown here. Complete them to earn points!',
  },
  {
    target: '.leaderboard-section',
    content: 'Check the leaderboard to see how you rank against other users. Stay motivated!',
  },
  {
    target: '.log-tracker',
    content: 'Track your daily logs and view your monthly activity history here.',
  },
  {
    target: '.bottom-nav',
    content: 'Use the bottom navigation to quickly move between different sections of the app.',
  },
];

// Tasks Page Tour
export const tasksTourSteps: Step[] = [
  {
    target: '.tasks-header',
    content: 'Welcome to the Tasks page! Here you can log your daily activities and track progress.',
    disableBeacon: true,
  },
  {
    target: '.countdown-timer',
    content: 'This timer shows how much time you have left to submit your daily log. Make sure to log before midnight!',
  },
  {
    target: '.weekly-activities',
    content: 'These are your weekly activities. Enter the values you\'ve achieved for each activity.',
  },
  {
    target: '.daily-activities',
    content: 'Your daily activities are shown here. Log them every day to maintain your streak!',
  },
  {
    target: '.submit-log-button',
    content: 'Once you\'ve entered all your activity values, click here to submit your daily log.',
  },
  {
    target: '.weekly-summary',
    content: 'View your weekly summary and track your overall progress here.',
  },
  {
    target: '.bottom-nav',
    content: 'Use the navigation to switch to other pages when you\'re done logging.',
  },
];

// Create Plan Page Tour
export const createPlanTourSteps: Step[] = [
  {
    target: '.create-plan-header',
    content: 'Welcome to Create Plan! Here you can set up your weekly activity goals.',
    disableBeacon: true,
  },
  {
    target: '.unlock-info',
    content: 'Note: You can only create a plan on Friday, Saturday, or Sunday for the upcoming week.',
  },
  {
    target: '.activity-list',
    content: 'Browse through available activities and select the ones you want to include in your weekly plan.',
  },
  {
    target: '.activity-card',
    content: 'Each activity card shows the activity details. Click on a card to select it for your plan.',
  },
  {
    target: '.selected-activities',
    content: 'Your selected activities appear here. You can remove them if you change your mind.',
  },
  {
    target: '.configure-step',
    content: 'After selecting activities, configure target values for each one based on your fitness level.',
  },
  {
    target: '.target-input',
    content: 'Enter target values for each activity. The system will suggest recommended ranges.',
  },
  {
    target: '.create-button',
    content: 'Once configured, click here to create your weekly plan!',
  },
  {
    target: '.bottom-nav',
    content: 'Navigate to other sections using the bottom menu.',
  },
];

// Community Page Tour
export const communityTourSteps: Step[] = [
  {
    target: '.community-header',
    content: 'Welcome to the Community page! Connect with others who share your fitness goals.',
    disableBeacon: true,
  },
  {
    target: '.community-tabs',
    content: 'Switch between discovering new communities and viewing your joined communities.',
  },
  {
    target: '.trending-communities',
    content: 'Explore trending communities based on different activities and interests.',
  },
  {
    target: '.community-card',
    content: 'Each card shows community details including members, category, and description.',
  },
  {
    target: '.join-button',
    content: 'Click "Join" to become part of a community and compete with its members.',
  },
  {
    target: '.my-communities',
    content: 'View all communities you\'ve joined and see your rank within each one.',
  },
  {
    target: '.community-stats',
    content: 'Track your ranking, average points, and progress towards community goals.',
  },
  {
    target: '.bottom-nav',
    content: 'Use the navigation bar to explore other features.',
  },
];

// Settings Page Tour
export const settingsTourSteps: Step[] = [
  {
    target: '.settings-header',
    content: 'Welcome to Settings! Manage your account and preferences here.',
    disableBeacon: true,
  },
  {
    target: '.profile-section',
    content: 'View and edit your profile information including name, email, and avatar.',
  },
  {
    target: '.family-members',
    content: 'Manage family member profiles. Add, edit, or switch between different profiles.',
  },
  {
    target: '.change-password',
    content: 'Click here to change your password for security.',
  },
  {
    target: '.notification-settings',
    content: 'Customize your notification preferences and reminder settings.',
  },
  {
    target: '.privacy-settings',
    content: 'Control your privacy settings and data sharing preferences.',
  },
  {
    target: '.bottom-nav',
    content: 'Return to other sections using the navigation bar.',
  },
];

// Referral Page Tour
export const referralTourSteps: Step[] = [
  {
    target: '.referral-header',
    content: 'Welcome to Referrals! Invite friends and earn rewards together.',
    disableBeacon: true,
  },
  {
    target: '.referral-code',
    content: 'This is your unique referral code. Share it with friends to invite them.',
  },
  {
    target: '.copy-button',
    content: 'Click here to copy your referral code to clipboard.',
  },
  {
    target: '.share-options',
    content: 'Share your referral link via social media, email, or messaging apps.',
  },
  {
    target: '.rewards-info',
    content: 'See the rewards you can earn when friends join using your referral code.',
  },
  {
    target: '.referral-stats',
    content: 'Track how many people have joined using your code and your earned rewards.',
  },
  {
    target: '.bottom-nav',
    content: 'Navigate to other sections of the app.',
  },
];
