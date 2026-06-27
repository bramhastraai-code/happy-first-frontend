import type { Activity } from '@/lib/api/activity';

const FALLBACK_BY_NAME: Record<string, string> = {
  steps: '👣',
  yoga: '🧘',
  gym: '🏋️',
  floors: '🏢',
  sleep: '😴',
  water: '💧',
  run: '🏃',
  swimming: '🏊',
  meditation: '🧘‍♂️',
  reading: '📖',
  cycling: '🚴',
  hobby: '🎨',
};

export function resolveActivityIcon(
  activities: Activity[] | undefined,
  activityId?: string,
  activityName?: string
): string {
  if (activities?.length) {
    if (activityId) {
      const byId = activities.find((a) => a._id === activityId);
      if (byId?.icon) return byId.icon;
    }
    if (activityName) {
      const normalized = activityName.toLowerCase();
      const byName = activities.find((a) => a.name.toLowerCase() === normalized);
      if (byName?.icon) return byName.icon;
    }
  }

  if (activityName) {
    const key = activityName.toLowerCase().replace(/\s+/g, '');
    return FALLBACK_BY_NAME[key] ?? '🎯';
  }

  return '🎯';
}
