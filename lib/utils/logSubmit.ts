import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import { resolveActivityId } from '@/lib/utils/activityId';

export interface LogActivityEntry {
  activityId: string;
  value: number;
}

export function isWeeklyDaysActivity(activity: WeeklyPlan['activities'][number]) {
  return activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days';
}

export function getRemainingActivities(weeklyPlan: WeeklyPlan) {
  return weeklyPlan.activities.filter((activity) => !activity.TodayLogged);
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

  return activities[activityId] ?? 0;
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
      if (value == null) return null;
      return {
        activityId: resolveActivityId(activity),
        value,
      };
    })
    .filter((entry): entry is LogActivityEntry => entry != null);
}

/** True when every not-yet-logged plan activity is ready for full-day submit. */
export function canSubmitFullDayLog(
  weeklyPlan: WeeklyPlan,
  activities: Record<string, number>,
  checkboxActivities: Record<string, boolean>,
  pendingSliders: Record<string, boolean>
): boolean {
  const remaining = getRemainingActivities(weeklyPlan);
  if (remaining.length === 0) return false;

  return remaining.every((activity) => {
    const activityId = resolveActivityId(activity);
    if (isWeeklyDaysActivity(activity)) {
      return !(pendingSliders[activityId] ?? true);
    }
    void activities[activityId];
    void checkboxActivities[activityId];
    return true;
  });
}

/** @deprecated Use canSubmitFullDayLog */
export function canSubmitPartialLog(
  weeklyPlan: WeeklyPlan,
  activities: Record<string, number>,
  checkboxActivities: Record<string, boolean>,
  pendingSliders: Record<string, boolean>
): boolean {
  return canSubmitFullDayLog(weeklyPlan, activities, checkboxActivities, pendingSliders);
}

/** True when at least one plan activity has not been logged for the day yet. */
export function hasRemainingActivitiesToLog(weeklyPlan: WeeklyPlan | null | undefined): boolean {
  if (!weeklyPlan?.activities?.length) return false;
  return weeklyPlan.activities.some((activity) => !activity.TodayLogged);
}

/** True when every plan activity has been logged for the day. */
export function isAllActivitiesLogged(weeklyPlan: WeeklyPlan | null | undefined): boolean {
  if (!weeklyPlan?.activities?.length) return false;
  return weeklyPlan.activities.every((activity) => activity.TodayLogged);
}

export function validateLogSubmit(
  weeklyPlan: WeeklyPlan,
  activities: Record<string, number>,
  checkboxActivities: Record<string, boolean>,
  pendingSliders: Record<string, boolean>
): { ok: true; payload: LogActivityEntry[] } | { ok: false; error: string } {
  const remaining = getRemainingActivities(weeklyPlan);

  if (remaining.length === 0) {
    return {
      ok: false,
      error: 'All activities are already logged for today.',
    };
  }

  const pendingCheckbox = remaining.find((activity) => {
    if (!isWeeklyDaysActivity(activity)) return false;
    const activityId = resolveActivityId(activity);
    return pendingSliders[activityId] ?? true;
  });

  if (pendingCheckbox) {
    return {
      ok: false,
      error: `Set "${pendingCheckbox.label || 'each weekly activity'}" to Done or Not Done before submitting.`,
    };
  }

  const payload = buildLogSubmitPayload(weeklyPlan, activities, checkboxActivities, pendingSliders);
  const remainingIds = new Set(remaining.map((a) => resolveActivityId(a)));
  const payloadIds = new Set(payload.map((e) => e.activityId));

  if (payload.length !== remaining.length || ![...remainingIds].every((id) => payloadIds.has(id))) {
    return {
      ok: false,
      error: 'Please review every activity before submitting your daily log.',
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
