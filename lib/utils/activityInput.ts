import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import type { Activity as ActivityType } from '@/lib/api/activity';

/** Max input from all tier maxVal values (fixes tier-1-only clamp). */
export function getActivityInputMax(
  activity: WeeklyPlanActivity,
  activityData?: ActivityType
): number {
  const valueSources = activityData?.values ?? activity.values ?? [];
  const tierMaxes = valueSources
    .map((v) => v.maxVal)
    .filter((v): v is number => typeof v === 'number');
  const baseMax = tierMaxes.length > 0 ? Math.max(...tierMaxes) : 500000;
  const isWeeklyNumericTarget =
    activity.cadence === 'weekly' && activity.unit.toLowerCase() !== 'days';
  return isWeeklyNumericTarget ? Math.max(baseMax, baseMax * 7) : baseMax;
}
