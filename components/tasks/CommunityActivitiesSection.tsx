'use client';

import TaskActivityRow from '@/components/tasks/TaskActivityRow';
import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import type { Activity as ActivityType } from '@/lib/api/activity';
import type { MyCommunityActivity } from '@/lib/api/community';

interface CommunityActivitiesSectionProps {
  activities: MyCommunityActivity[];
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
}

function toDailyFromWeekly(weeklyTarget: number) {
  const daily = Number(weeklyTarget) / 7;
  if (!Number.isFinite(daily)) return 0;
  // Keep one decimal for fractional weekly targets (e.g. Water 24.5 → 3.5/day)
  return Math.round(daily * 100) / 100;
}

function toPlanShape(row: MyCommunityActivity): WeeklyPlanActivity {
  const weekly = Number(row.weeklyTarget) || 0;
  const daily = row.cadence === 'daily' ? toDailyFromWeekly(weekly) : undefined;
  return {
    activity: row.activityId,
    cadence: row.cadence,
    // Task row shows targetValue with /day or /week — use daily for daily cadence
    targetValue: daily ?? weekly,
    dailyTarget: daily,
    label: row.label || row.name,
    unit: row.unit || row.baseUnit || '',
    TodayLogged: Boolean(row.TodayLogged),
    isSurpriseActivity: false,
    values: [{ tier: 1, maxVal: 500000, minVal: 0 }],
  };
}

export default function CommunityActivitiesSection({
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
}: CommunityActivitiesSectionProps) {
  if (!activities.length) return null;

  return (
    <section className="section-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Community Activities</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Extra activities from your communities — do not affect your personal Wellth score
        </p>
      </div>

      {activities.map((row, index) => {
        const activity = toPlanShape(row);
        const activityId = row.activityId;
        const activityData = actlist.find((act) => act._id === activityId);

        return (
          <TaskActivityRow
            key={activityId}
            activity={activity}
            activityData={activityData}
            activityId={activityId}
            isSurprise={false}
            isAfter6PM={isAfter6PM}
            timeUntilMidnight={timeUntilMidnight}
            value={activityValues[activityId] || 0}
            checkboxChecked={checkboxActivities[activityId] || false}
            isPending={pendingSliders[activityId] ?? true}
            onActivityChange={onActivityChange}
            onCheckboxChange={onCheckboxChange}
            onPendingChange={onPendingChange}
            getActivityInputMax={getActivityInputMax}
            isLast={index === activities.length - 1}
          />
        );
      })}
    </section>
  );
}
