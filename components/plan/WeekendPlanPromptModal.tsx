'use client';

import { createPortal } from 'react-dom';
import { type PlanChoiceState } from '@/lib/api/weeklyPlan';
import { WeekendPlanPromptContent } from '@/components/plan/WeekendPlanPromptContent';

interface WeekendPlanPromptModalProps {
  weekendPrompt: PlanChoiceState['weekendPrompt'] | null;
  onResolved?: () => void;
}

export function WeekendPlanPromptModal({
  weekendPrompt,
  onResolved,
}: WeekendPlanPromptModalProps) {
  if (typeof document === 'undefined' || !weekendPrompt?.show) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekend-plan-prompt-title"
    >
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_20px_60px_rgb(28_25_23/0.25)] sm:slide-in-from-bottom-0">
        <WeekendPlanPromptContent
          weekendPrompt={weekendPrompt}
          onResolved={onResolved}
          showClose
        />
      </div>
    </div>,
    document.body
  );
}
