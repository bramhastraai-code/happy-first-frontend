'use client';

import type { FitnessGoal } from '@/lib/tracker/types';
import { cn } from '@/lib/utils';

interface GoalProgressProps {
  goals: FitnessGoal[];
}

export default function GoalProgress({ goals }: GoalProgressProps) {
  if (!goals.length) {
    return (
      <div className="section-card px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">No active goals yet. Create one below to track progress.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => {
        const percent = Math.min(100, goal.percent ?? 0);
        return (
          <div key={goal._id} className="section-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold capitalize text-foreground">
                  {goal.period} {goal.type}
                  {goal.activityType ? ` · ${goal.activityType}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {goal.current ?? 0} / {goal.target}
                </p>
              </div>
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                {percent}%
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full bg-primary transition-all',
                  percent >= 100 && 'bg-emerald-500'
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
