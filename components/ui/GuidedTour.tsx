'use client';

import { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { homeTourSteps } from '@/lib/utils/tourSteps';

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
  steps?: Step[];
}

export default function GuidedTour({ run, onFinish, steps: customSteps }: GuidedTourProps) {
  const [steps] = useState<Step[]>(customSteps ?? homeTourSteps);

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
      scrollToFirstStep
      disableOverlayClose
      spotlightPadding={10}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#ea580c',
          textColor: '#1c1917',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(28, 25, 23, 0.55)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 16,
          padding: 16,
          fontSize: 14,
          lineHeight: 1.5,
        },
        tooltipTitle: {
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 6,
        },
        tooltipContent: {
          padding: '4px 0 12px',
        },
        buttonNext: {
          backgroundColor: '#ea580c',
          borderRadius: 9999,
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 600,
        },
        buttonBack: {
          color: '#78716c',
          marginRight: 8,
          fontSize: 13,
        },
        buttonSkip: {
          color: '#78716c',
          fontSize: 13,
        },
        spotlight: {
          borderRadius: 12,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip',
      }}
    />
  );
}
