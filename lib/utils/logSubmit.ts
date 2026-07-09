import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import { resolveActivityId } from '@/lib/utils/activityId';

export interface LogActivityEntry {
  activityId: string;
  value: number;
}

export function isWeeklyDaysActivity(activity: WeeklyPlan['activities'][number]) {
  return activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days';
}

export function getActivityLogValue(
  activity: WeeklyPlan['activities'][number],
  activities: Record<string, number>,
  checkboxActivities: Record<string, boolean>,
  pendingSliders: Record<string, boolean>
): number | null {
  const activityId = resolveActivityId(activity);

  if (activity.TodayLogged) {
    return null;
  }

  if (isWeeklyDaysActivity(activity)) {
    const isPending = pendingSliders[activityId] ?? true;
    if (isPending) return null;
    return checkboxActivities[activityId] ? 1 : 0;
  }

  const value = activities[activityId] ?? 0;
  return value > 0 ? value : null;
}

export function buildLogSubmitPayload(
  weeklyPlan: WeeklyPlan,
  activities: Record<string, number>,
  checkboxActivities: Record<string, boolean>,
  pendingSliders: Record<string, boolean>
): LogActivityEntry[] {
  return weeklyPlan.activities
    .map((activity) => {
      const value = getActivityLogValue(activity, activities, checkboxActivities, pendingSliders);
      if (value == null || value <= 0) return null;
      return {
        activityId: resolveActivityId(activity),
        value,
      };
    })
    .filter((entry): entry is LogActivityEntry => entry != null);
}

export function canSubmitPartialLog(
  weeklyPlan: WeeklyPlan,
  activities: Record<string, number>,
  checkboxActivities: Record<string, boolean>,
  pendingSliders: Record<string, boolean>
): boolean {
  return buildLogSubmitPayload(weeklyPlan, activities, checkboxActivities, pendingSliders).length > 0;
}

export function validateLogSubmit(
  weeklyPlan: WeeklyPlan,
  activities: Record<string, number>,
  checkboxActivities: Record<string, boolean>,
  pendingSliders: Record<string, boolean>
): { ok: true; payload: LogActivityEntry[] } | { ok: false; error: string } {
  const payload = buildLogSubmitPayload(weeklyPlan, activities, checkboxActivities, pendingSliders);

  if (payload.length === 0) {
    const hasPendingOnly = weeklyPlan.activities.some((activity) => {
      if (activity.TodayLogged || !isWeeklyDaysActivity(activity)) return false;
      const activityId = resolveActivityId(activity);
      return pendingSliders[activityId] ?? true;
    });

    if (hasPendingOnly) {
      return {
        ok: false,
        error: 'Set each activity to Done or Not Done, or enter a value for at least one activity.',
      };
    }

    return {
      ok: false,
      error: 'Please log at least one new activity before submitting.',
    };
  }

  const alreadyLogged = payload
    .map((entry) => weeklyPlan.activities.find((activity) => resolveActivityId(activity) === entry.activityId))
    .find((activity) => activity?.TodayLogged);

  if (alreadyLogged) {
    return {
      ok: false,
      error: `${alreadyLogged.label || 'An activity'} is already logged for today.`,
    };
  }

  return { ok: true, payload };
}

export function extractEarnedPoints(responseData?: {
  totalPoints?: number;
  details?: Array<{ points?: number }>;
}): number {
  if (!responseData) return 0;
  if (typeof responseData.totalPoints === 'number' && !Number.isNaN(responseData.totalPoints)) {
    return responseData.totalPoints;
  }
  return (responseData.details ?? []).reduce((sum, item) => sum + (item.points ?? 0), 0);
}
