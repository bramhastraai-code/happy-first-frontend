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
  const name = String(activity.label || activityData?.name || '').toLowerCase();
  const unit = String(activity.unit || activityData?.baseUnit || '').toLowerCase();
  const stepsFallback = unit === 'steps' || name === 'steps' ? 30000 : undefined;
  const baseMax = tierMaxes.length > 0 ? Math.max(...tierMaxes) : stepsFallback ?? 500000;
  const isWeeklyNumericTarget =
    activity.cadence === 'weekly' && activity.unit.toLowerCase() !== 'days';
  return isWeeklyNumericTarget ? Math.max(baseMax, baseMax * 7) : baseMax;
}
