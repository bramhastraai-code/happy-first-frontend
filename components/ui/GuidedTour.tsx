'use client';

import { useEffect, useMemo, useState } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS, type CallBackProps, type Step } from 'react-joyride';
import { homeTourSteps } from '@/lib/utils/tourSteps';
import { useMascotThemeColor } from '@/lib/hooks/useMascotThemeColor';

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
  steps?: Step[];
}

function visibleSteps(all: Step[]): Step[] {
  if (typeof document === 'undefined') return all;
  return all.filter((step) => {
    const target = String(step.target);
    try {
      return Boolean(document.querySelector(target));
    } catch {
      return false;
    }
  });
}

export default function GuidedTour({ run, onFinish, steps: customSteps }: GuidedTourProps) {
  const source = customSteps ?? homeTourSteps;
  const primaryColor = useMascotThemeColor();
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const steps = useMemo(() => (ready ? visibleSteps(source) : []), [ready, source]);

  useEffect(() => {
    if (!run) {
      setReady(false);
      setStepIndex(0);
      return;
    }
    document.documentElement.classList.add('hf-tour-active');
    const id = window.setTimeout(() => {
      setStepIndex(0);
      setReady(true);
    }, 200);
    return () => {
      window.clearTimeout(id);
      document.documentElement.classList.remove('hf-tour-active');
    };
  }, [run]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index, size } = data;
    const finished =
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      action === ACTIONS.CLOSE;

    if (finished) {
      onFinish();
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      const next = index + 1;
      if (next >= size) onFinish();
      else setStepIndex(next);
      return;
    }

    if (type === EVENTS.STEP_AFTER && (action === ACTIONS.NEXT || action === ACTIONS.PREV)) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  if (!run || !ready || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      spotlightClicks={false}
      spotlightPadding={10}
      scrollOffset={96}
      callback={handleJoyrideCallback}
      floaterProps={{ disableAnimation: true }}
      styles={{
        options: {
          primaryColor,
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
          maxWidth: 320,
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
          backgroundColor: primaryColor,
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
          borderRadius: 16,
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
