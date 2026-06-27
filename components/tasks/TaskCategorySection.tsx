'use client';

import TaskActivityRow from '@/components/tasks/TaskActivityRow';
import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import type { Activity as ActivityType } from '@/lib/api/activity';

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
  onActivityChange: (activityId: string, value: string) => void;
  onCheckboxChange: (activityId: string, checked: boolean) => void;
  onPendingChange: (activityId: string, isPending: boolean) => void;
  getActivityInputMax: (activity: WeeklyPlanActivity, activityData?: ActivityType) => number;
}

export default function TaskCategorySection({
  category,
  activities,
  actlist,
  isAfter6PM,
  timeUntilMidnight,
  activityValues,
  checkboxActivities,
  onActivityChange,
  onCheckboxChange,
  onPendingChange,
  getActivityInputMax,
}: TaskCategorySectionProps) {
  const meta = CATEGORY_META[category.toLowerCase()];
  if (!meta) return null;

  const categoryActivities = activities.filter((activity) => {
    const activityData = actlist.find((act) => act._id === activity.activity);
    return activityData?.category.toLowerCase() === category.toLowerCase();
  });

  if (categoryActivities.length === 0) return null;

  return (
    <section className="section-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-base">{meta.emoji}</span>
        <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {categoryActivities.length} {categoryActivities.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {categoryActivities.map((activity, index) => {
        const activityId =
          typeof activity.activity === 'object' ? activity.activity : activity.activity;
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
            onActivityChange={onActivityChange}
            onCheckboxChange={onCheckboxChange}
            onPendingChange={onPendingChange}
            getActivityInputMax={getActivityInputMax}
            isLast={index === categoryActivities.length - 1}
          />
        );
      })}
    </section>
  );
}
