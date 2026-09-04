'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import TaskActivityRow from '@/components/tasks/TaskActivityRow';
import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import type { Activity as ActivityType } from '@/lib/api/activity';
import { resolveActivityId } from '@/lib/utils/activityId';
import { cn } from '@/lib/utils';

const CATEGORY_META: Record<
  string,
  { label: string; emoji: string }
> = {
  mind: { label: 'Mind', emoji: '🧠' },
  body: { label: 'Body', emoji: '💪' },
  soul: { label: 'Soul', emoji: '✨' },
};

interface TaskCategorySectionProps {
  category: string;
  activities: WeeklyPlanActivity[];
  actlist: ActivityType[];
  isAfter6PM: boolean;
  timeUntilMidnight: string;
  activityValues: Record<string, number>;
  checkboxActivities: Record<string, boolean>;
  pendingSliders: Record<string, boolean>;
  onActivityChange: (activityId: string, value: string) => void;
  onCheckboxChange: (activityId: string, checked: boolean) => void;
  onPendingChange: (activityId: string, isPending: boolean) => void;
  getActivityInputMax: (activity: WeeklyPlanActivity, activityData?: ActivityType) => number;
  defaultOpen?: boolean;
}

export default function TaskCategorySection({
  category,
  activities,
  actlist,
  isAfter6PM,
  timeUntilMidnight,
  activityValues,
  checkboxActivities,
  pendingSliders,
  onActivityChange,
  onCheckboxChange,
  onPendingChange,
  getActivityInputMax,
  defaultOpen = false,
}: TaskCategorySectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = CATEGORY_META[category.toLowerCase()];
  if (!meta) return null;

  const seenIds = new Set<string>();
  const categoryActivities = activities.filter((activity) => {
    const activityId = resolveActivityId(activity);
    if (!activityId || seenIds.has(activityId)) return false;
    const activityData = actlist.find((act) => act._id === activityId);
    if (activityData?.category.toLowerCase() !== category.toLowerCase()) return false;
    seenIds.add(activityId);
    return true;
  });

  if (categoryActivities.length === 0) return null;

  return (
    <section id={category.toLowerCase()} className="scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-3 text-left"
      >
        <span className="text-base" aria-hidden>
          {meta.emoji}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {categoryActivities.length}
        </span>
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open
        ? categoryActivities.map((activity, index) => {
            const activityId = resolveActivityId(activity);
            const activityData = actlist.find((act) => act._id === activityId);

            return (
              <TaskActivityRow
                key={activityId}
                activity={activity}
                activityData={activityData}
                activityId={activityId}
                isSurprise={Boolean(activity.isSurpriseActivity)}
                isAfter6PM={isAfter6PM}
                timeUntilMidnight={timeUntilMidnight}
                value={activityValues[activityId] || 0}
                checkboxChecked={checkboxActivities[activityId] || false}
                isPending={pendingSliders[activityId] ?? true}
                onActivityChange={onActivityChange}
                onCheckboxChange={onCheckboxChange}
                onPendingChange={onPendingChange}
                getActivityInputMax={getActivityInputMax}
                isLast={index === categoryActivities.length - 1}
              />
            );
          })
        : null}
    </section>
  );
}
