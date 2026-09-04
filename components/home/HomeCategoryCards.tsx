'use client';

import { useMemo } from 'react';
import type { Activity } from '@/lib/api/activity';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { resolveActivityId } from '@/lib/utils/activityId';
import {
  ACTIVITY_CATEGORIES,
  type ActivityCategory,
} from '@/lib/utils/activityCategory';
import { clampPercent, ratioToPercent } from '@/lib/utils/percent';
import { cn } from '@/lib/utils';

type HomeCategoryCardsProps = {
  weeklyPlan?: WeeklyPlan | null;
  activityList?: Activity[];
  selectedCategory?: ActivityCategory | null;
  onCategoryChange?: (category: ActivityCategory | null) => void;
};

function weekTargetUnits(activity: WeeklyPlanActivity): number {
  const target = Number(activity.targetValue) || 0;
  if (target <= 0) return 0;
  return activity.cadence === 'daily' ? target * 7 : target;
}

function achievedUnits(activity: WeeklyPlanActivity): number {
  return Number(activity.achievedUnits ?? activity.achieved ?? 0) || 0;
}

function CategoryProgressRing({
  percent,
  emoji,
  label,
}: {
  percent: number;
  emoji: string;
  label: string;
}) {
  const capped = clampPercent(percent);
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (capped / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16"
      role="img"
      aria-label={`${label} ${capped}% this week`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-primary/15"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center rounded-full text-base sm:text-lg"
        aria-hidden
      >
        {emoji}
      </span>
    </div>
  );
}

export function HomeCategoryCards({
  weeklyPlan = null,
  activityList = [],
  selectedCategory = null,
  onCategoryChange,
}: HomeCategoryCardsProps) {
  const stats = useMemo(() => {
    const byCategory: Record<string, { achieved: number; target: number; percent: number }> = {
      body: { achieved: 0, target: 0, percent: 0 },
      mind: { achieved: 0, target: 0, percent: 0 },
      soul: { achieved: 0, target: 0, percent: 0 },
    };

    if (!weeklyPlan?.activities?.length) return byCategory;

    const categoryById = new Map(
      activityList.map((activity) => [activity._id, (activity.category || '').toLowerCase()])
    );
    const seenIds = new Set<string>();

    for (const activity of weeklyPlan.activities) {
      const id = resolveActivityId(activity);
      if (!id || seenIds.has(id)) continue;
      const category = categoryById.get(id);
      if (!category || !byCategory[category]) continue;
      seenIds.add(id);

      const target = weekTargetUnits(activity);
      // Cap each activity at its own week target so overlogging can't push category past 100%.
      byCategory[category].achieved += Math.min(achievedUnits(activity), target);
      byCategory[category].target += target;
    }

    for (const key of Object.keys(byCategory)) {
      const row = byCategory[key];
      row.percent = ratioToPercent(row.achieved, row.target);
    }

    return byCategory;
  }, [weeklyPlan, activityList]);

  return (
    <div className="home-category-cards grid grid-cols-3 gap-2 sm:gap-2.5">
      {ACTIVITY_CATEGORIES.map((category) => {
        const { percent } = stats[category.id];
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() =>
              onCategoryChange?.(isSelected ? null : category.id)
            }
            aria-pressed={isSelected}
            className="flex cursor-pointer flex-col items-center gap-1.5 bg-transparent px-2 py-2.5 text-center sm:py-3"
          >
            <CategoryProgressRing
              percent={percent}
              emoji={category.emoji}
              label={category.label}
            />
            <span className="text-xs font-semibold leading-none text-foreground sm:text-sm">
              {category.label}
            </span>
            <span className="text-sm font-bold tabular-nums leading-none text-primary sm:text-base">
              {percent}%
            </span>
            <span className="text-[9px] font-medium leading-none text-muted-foreground sm:text-[10px]">
              This week
            </span>
            <span
              aria-hidden
              className={cn(
                'mt-0.5 h-1 w-6 rounded-full transition-colors',
                isSelected ? 'bg-primary' : 'bg-transparent'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
