'use client';

import { type PlanChoiceState } from '@/lib/api/weeklyPlan';
import { cn } from '@/lib/utils';
import { WeekendPlanPromptContent } from '@/components/plan/WeekendPlanPromptContent';

interface WeekendPlanPromptCardProps {
  weekendPrompt: NonNullable<PlanChoiceState['weekendPrompt']>;
  onResolved?: () => void;
  className?: string;
}

/** Inline fallback — prefer WeekendPlanPromptModal on Home/Tasks. */
export function WeekendPlanPromptCard({
  weekendPrompt,
  onResolved,
  className,
}: WeekendPlanPromptCardProps) {
  if (!weekendPrompt.show) return null;

  return (
    <div className={cn('section-card p-4 sm:p-5', className)}>
      <WeekendPlanPromptContent weekendPrompt={weekendPrompt} onResolved={onResolved} />
    </div>
  );
}
