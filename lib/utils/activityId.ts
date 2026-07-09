import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';

/** Normalize weekly-plan activity reference to a string id for API payloads and state keys. */
export function resolveActivityId(activity: WeeklyPlanActivity | { activity: unknown }): string {
  const ref = activity.activity;
  if (ref == null) return '';
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    const id = (ref as { _id?: string })._id;
    if (typeof id === 'string') return id;
    if (id != null) return String(id);
  }
  return String(ref);
}
