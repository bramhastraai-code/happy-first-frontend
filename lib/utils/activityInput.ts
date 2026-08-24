import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import type { Activity as ActivityType } from '@/lib/api/activity';

/** Unlock / value-config tiers used across plan create + logging. */
export const ACTIVITY_VALUE_TIERS = [1, 2, 3, 4] as const;

export type ActivityValueTier = {
  tier: number;
  minVal: number;
  maxVal: number;
};

function isValidRange(v: ActivityValueTier | undefined | null): v is ActivityValueTier {
  return (
    !!v &&
    typeof v.tier === 'number' &&
    typeof v.minVal === 'number' &&
    typeof v.maxVal === 'number' &&
    Number.isFinite(v.minVal) &&
    Number.isFinite(v.maxVal)
  );
}

/**
 * Resolve min/max for any unlock tier (1–4+).
 *
 * Seed / catalog often only stores a tier-1 row (or identical rows for 1–4).
 * Never require an exact match on the member's unlock tier — fall back to the
 * best available configured range so Steps (etc.) stay usable after set-2 unlock.
 */
export function resolveActivityValueRange(
  values: ActivityValueTier[] | undefined | null,
  userTier = 1
): { minVal: number; maxVal: number } | null {
  const rows = (Array.isArray(values) ? values : []).filter(isValidRange);
  if (rows.length === 0) return null;

  const unlockTier = Number.isFinite(userTier) && userTier > 0 ? Math.floor(userTier) : 1;

  // Single configured range → use it for every unlock tier.
  if (rows.length === 1) {
    return { minVal: rows[0].minVal, maxVal: rows[0].maxVal };
  }

  const exact = rows.find((v) => v.tier === unlockTier);
  if (exact) {
    return { minVal: exact.minVal, maxVal: exact.maxVal };
  }

  const eligible = rows
    .filter((v) => v.tier <= unlockTier)
    .sort((a, b) => b.tier - a.tier);
  if (eligible[0]) {
    return { minVal: eligible[0].minVal, maxVal: eligible[0].maxVal };
  }

  // Unlock tier below every values.tier (unusual) → lowest configured tier.
  const lowest = [...rows].sort((a, b) => a.tier - b.tier)[0];
  return { minVal: lowest.minVal, maxVal: lowest.maxVal };
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
