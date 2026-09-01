'use client';

import { useMemo } from 'react';
import type { Activity } from '@/lib/api/activity';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { resolveActivityId } from '@/lib/utils/activityId';

const CATEGORIES = [
  { id: 'body', label: 'Body', emoji: '💪' },
  { id: 'mind', label: 'Mind', emoji: '🧠' },
  { id: 'soul', label: 'Soul', emoji: '✨' },
] as const;

type HomeCategoryCardsProps = {
  weeklyPlan?: WeeklyPlan | null;
  activityList?: Activity[];
};

function weekTargetUnits(activity: WeeklyPlanActivity): number {
  const target = Number(activity.targetValue) || 0;
  if (target <= 0) return 0;
  return activity.cadence === 'daily' ? target * 7 : target;
}

function achievedUnits(activity: WeeklyPlanActivity): number {
  return Number(activity.achievedUnits ?? activity.achieved ?? 0) || 0;
}

export function HomeCategoryCards({
  weeklyPlan = null,
  activityList = [],
}: HomeCategoryCardsProps) {
  const stats = useMemo(() => {
    const byCategory: Record<string, { achieved: number; target: number; percent: number }> = {
      body: { achieved: 0, target: 0, percent: 0 },
      mind: { achieved: 0, target: 0, percent: 0 },
      soul: { achieved: 0, target: 0, percent: 0 },
    };

    if (!weeklyPlan?.activities?.length) return byCategory;

    const categoryById = new Map(
      activityList.map((a) => [a._id, (a.category || '').toLowerCase()])
    );
    const seenIds = new Set<string>();

    for (const activity of weeklyPlan.activities) {
      const id = resolveActivityId(activity);
      if (!id || seenIds.has(id)) continue;
      const category = categoryById.get(id);
      if (!category || !byCategory[category]) continue;
      seenIds.add(id);

      byCategory[category].achieved += achievedUnits(activity);
      byCategory[category].target += weekTargetUnits(activity);
    }

    for (const key of Object.keys(byCategory)) {
      const row = byCategory[key];
      row.percent =
        row.target > 0 ? Math.round((row.achieved / row.target) * 100) : 0;
    }

    return byCategory;
  }, [weeklyPlan, activityList]);

  return (
    <div className="home-category-cards grid grid-cols-3 gap-2 sm:gap-2.5">
      {CATEGORIES.map((category) => {
        const { percent } = stats[category.id];

        return (
          <div
            key={category.id}
            className="section-card flex flex-col items-center gap-1 px-2 py-2 text-center sm:py-2.5"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-base sm:h-9 sm:w-9 sm:text-lg"
              aria-hidden
            >
              {category.emoji}
            </span>
            <span className="text-xs font-semibold leading-none text-foreground sm:text-sm">
              {category.label}
            </span>
            <span className="text-sm font-bold tabular-nums leading-none text-primary sm:text-base">
              {percent}%
            </span>
            <div className="h-1 w-full max-w-[72px] overflow-hidden rounded-full bg-primary/15 sm:max-w-[80px]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-[width] duration-500"
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-medium leading-none text-muted-foreground sm:text-[10px]">
              This week
            </span>
          </div>
        );
      })}
    </div>
  );
}
