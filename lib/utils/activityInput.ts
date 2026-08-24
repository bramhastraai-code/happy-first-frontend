import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import type { Activity as ActivityType } from '@/lib/api/activity';

type ActivityValueTier = {
  tier: number;
  minVal: number;
  maxVal: number;
};

/**
 * Resolve min/max for plan targets.
 * Activities are usually seeded with tier-1 ranges only; unlocked set (user tier)
 * may be 2+, so exact-tier lookup must fall back to the best available row.
 */
export function resolveActivityValueRange(
  values: ActivityValueTier[] | undefined | null,
  userTier = 1
): { minVal: number; maxVal: number } | null {
  if (!Array.isArray(values) || values.length === 0) return null;

  const exact = values.find((v) => v.tier === userTier);
  if (exact && typeof exact.minVal === 'number' && typeof exact.maxVal === 'number') {
    return { minVal: exact.minVal, maxVal: exact.maxVal };
  }

  const eligible = values
    .filter(
      (v) =>
        typeof v.tier === 'number' &&
        v.tier <= userTier &&
        typeof v.minVal === 'number' &&
        typeof v.maxVal === 'number'
    )
    .sort((a, b) => b.tier - a.tier);
  if (eligible[0]) {
    return { minVal: eligible[0].minVal, maxVal: eligible[0].maxVal };
  }

  const any = [...values]
    .filter((v) => typeof v.minVal === 'number' && typeof v.maxVal === 'number')
    .sort((a, b) => a.tier - b.tier)[0];
  return any ? { minVal: any.minVal, maxVal: any.maxVal } : null;
}

function stepsAwareFallbackMax(nameOrUnit: string): number | undefined {
  const key = nameOrUnit.toLowerCase();
  return key === 'steps' ? 30000 : undefined;
}

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
  const stepsFallback = stepsAwareFallbackMax(unit) ?? stepsAwareFallbackMax(name);
  const baseMax = tierMaxes.length > 0 ? Math.max(...tierMaxes) : stepsFallback ?? 500000;
  const isWeeklyNumericTarget =
    activity.cadence === 'weekly' && activity.unit.toLowerCase() !== 'days';
  return isWeeklyNumericTarget ? Math.max(baseMax, baseMax * 7) : baseMax;
}

/** Plan-target min/max for create-plan overlays (cadence-aware). */
export function getPlanTargetRange(
  activity: Pick<ActivityType, 'name' | 'baseUnit' | 'values'>,
  userTier: number,
  cadence: 'daily' | 'weekly' | 'none'
): { minVal: number; maxVal: number } {
  const resolved = resolveActivityValueRange(activity.values, userTier);
  const name = String(activity.name || '').toLowerCase();
  const unit = String(activity.baseUnit || '').toLowerCase();
  const stepsFallback = stepsAwareFallbackMax(unit) ?? stepsAwareFallbackMax(name);

  const minVal = resolved?.minVal ?? 0;
  let maxVal = resolved?.maxVal ?? stepsFallback ?? 500000;

  const isWeeklyNumericTarget = cadence === 'weekly' && unit !== 'days';
  if (isWeeklyNumericTarget) {
    maxVal = Math.max(maxVal, maxVal * 7);
  }

  return { minVal, maxVal };
}
