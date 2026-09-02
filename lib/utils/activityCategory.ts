import type { Activity } from '@/lib/api/activity';
import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { resolveActivityId } from '@/lib/utils/activityId';

export type ActivityCategory = 'body' | 'mind' | 'soul';

export const ACTIVITY_CATEGORIES = [
  { id: 'body' as const, label: 'Body', emoji: '💪' },
  { id: 'mind' as const, label: 'Mind', emoji: '🧠' },
  { id: 'soul' as const, label: 'Soul', emoji: '✨' },
];

export function buildActivityCategoryMap(activityList: Activity[]) {
  return new Map(
    activityList.map((activity) => [activity._id, (activity.category || '').toLowerCase()])
  );
}

export function activityMatchesCategory(
  activityId: string | null | undefined,
  categoryById: Map<string, string>,
  category: ActivityCategory | null
): boolean {
  if (!category || !activityId) return true;
  return categoryById.get(activityId) === category;
}

export function filterPlanActivitiesByCategory(
  activities: WeeklyPlanActivity[],
  categoryById: Map<string, string>,
  category: ActivityCategory | null
): WeeklyPlanActivity[] {
  if (!category) return activities;
  return activities.filter((activity) =>
    activityMatchesCategory(resolveActivityId(activity), categoryById, category)
  );
}

export function categoryLabel(category: ActivityCategory): string {
  return ACTIVITY_CATEGORIES.find((row) => row.id === category)?.label ?? category;
}
