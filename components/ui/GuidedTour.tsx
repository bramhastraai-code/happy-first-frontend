'use client';

import { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
  steps?: Step[];
}

export default function GuidedTour({ run, onFinish, steps: customSteps }: GuidedTourProps) {
  const defaultSteps: Step[] = [
    {
      target: '.welcome-banner',
      content: 'Welcome! This banner shows your current profile and points. Click here to see your profile details.',
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
      content: 'Track your performance here. Click on any bar to see detailed logs for that day/week!',
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

  const [steps] = useState<Step[]>(customSteps || defaultSteps);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#10b981',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: '#10b981',
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#6b7280',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}
