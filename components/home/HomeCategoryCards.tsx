'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Activity } from '@/lib/api/activity';
import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import { resolveActivityId } from '@/lib/utils/activityId';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'body', label: 'Body', emoji: '💪' },
  { id: 'mind', label: 'Mind', emoji: '🧠' },
  { id: 'soul', label: 'Soul', emoji: '✨' },
] as const;

type HomeCategoryCardsProps = {
  weeklyPlan?: WeeklyPlan | null;
  activityList?: Activity[];
};

export function HomeCategoryCards({
  weeklyPlan = null,
  activityList = [],
}: HomeCategoryCardsProps) {
  const stats = useMemo(() => {
    const byCategory: Record<string, { total: number; logged: number }> = {
      body: { total: 0, logged: 0 },
      mind: { total: 0, logged: 0 },
      soul: { total: 0, logged: 0 },
    };

    if (!weeklyPlan?.activities?.length) return byCategory;

    const categoryById = new Map(
      activityList.map((a) => [a._id, (a.category || '').toLowerCase()])
    );

    for (const activity of weeklyPlan.activities) {
      if (activity.cadence !== 'daily') continue;
      const id = resolveActivityId(activity);
      const category = categoryById.get(id);
      if (!category || !byCategory[category]) continue;
      byCategory[category].total += 1;
      if (activity.TodayLogged) byCategory[category].logged += 1;
    }

    return byCategory;
  }, [weeklyPlan, activityList]);

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {CATEGORIES.map((category) => {
        const { total, logged } = stats[category.id];
        const hint =
          total > 0
            ? `${logged}/${total} logged`
            : 'Open activities';

        return (
          <Link
            key={category.id}
            href={`/tasks#${category.id}`}
            className={cn(
              'section-card flex flex-col items-center gap-1.5 px-2 py-3.5 text-center transition',
              'hover:border-primary/30 active:scale-[0.98]'
            )}
          >
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-xl"
              aria-hidden
            >
              {category.emoji}
            </span>
            <span className="text-sm font-semibold text-foreground">{category.label}</span>
            <span className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
              {hint}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
