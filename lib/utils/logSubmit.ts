import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import { resolveActivityId } from '@/lib/utils/activityId';

export interface LogActivityEntry {
  activityId: string;
  value: number;
}

export function isWeeklyDaysActivity(activity: WeeklyPlan['activities'][number]) {
  return activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days';
}

export type UnusualValueWarning = {
  activityId: string;
  label: string;
  value: number;
  target: number;
  percentage: number;
};

/**
 * Flag numeric entries that are unusually low (<10%) or high (>200%) vs target.
 * Skips weekly days (done/not-done). Also skips weekly activities logged as 0 —
 * a weekly goal may already be finished earlier in the week with nothing left to log.
 * Daily cadence always runs the unusual check, including 0.
 */
export function collectUnusualValueWarnings(
  weeklyPlan: WeeklyPlan,
  activities: Record<string, number>
): UnusualValueWarning[] {
  const warnings: UnusualValueWarning[] = [];

  Object.entries(activities).forEach(([activityId, value]) => {
    const activity = weeklyPlan.activities.find((a) => resolveActivityId(a) === activityId);
    if (!activity || activity.TodayLogged || !activity.label) return;
    // Weekly days use Done/Not Done — not comparable as a numeric target ratio
    if (isWeeklyDaysActivity(activity)) return;
    // Weekly numeric: 0 is normal when the weekly target was already met earlier
    if (activity.cadence === 'weekly' && value === 0) return;

    const targetValue = activity.targetValue;
    const percentage = targetValue > 0 ? (value / targetValue) * 100 : 0;

    if (percentage < 10 || percentage > 200) {
      warnings.push({
        activityId,
        label: activity.label,
        value,
        target: targetValue,
        percentage: Math.round(percentage),
      });
    }
  });

  return warnings;
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
