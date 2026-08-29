/**
 * Regression: plan target ranges must resolve for unlock tiers 1–4.
 * Seed historically only stored values.tier === 1; unlock after 80% sets tier to 2+.
 *
 * Run: npx --yes tsx lib/utils/activityInput.test.ts
 */
import {
  ACTIVITY_VALUE_TIERS,
  getPlanTargetRange,
  resolveActivityValueRange,
} from './activityInput';

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
  }
}

function assertRange(
  actual: { minVal: number; maxVal: number } | null,
  minVal: number,
  maxVal: number,
  message: string
) {
  if (!actual) throw new Error(`${message}\n  expected range, got null`);
  assertEqual(actual.minVal, minVal, `${message} (min)`);
  assertEqual(actual.maxVal, maxVal, `${message} (max)`);
}

const stepsLegacy = [{ tier: 1, minVal: 1000, maxVal: 30000 }];
const stepsAllTiers = ACTIVITY_VALUE_TIERS.map((tier) => ({
  tier,
  minVal: 1000,
  maxVal: 30000,
}));
const progressive = [
  { tier: 1, minVal: 1000, maxVal: 8000 },
  { tier: 2, minVal: 2000, maxVal: 15000 },
  { tier: 3, minVal: 3000, maxVal: 25000 },
  { tier: 4, minVal: 4000, maxVal: 30000 },
];

for (const tier of ACTIVITY_VALUE_TIERS) {
  assertRange(
    resolveActivityValueRange(stepsLegacy, tier),
    1000,
    30000,
    `legacy Steps values work at unlock tier ${tier}`
  );
  assertRange(
    resolveActivityValueRange(stepsAllTiers, tier),
    1000,
    30000,
    `seeded Steps values work at unlock tier ${tier}`
  );
}

assertRange(resolveActivityValueRange(progressive, 1), 1000, 8000, 'progressive tier 1');
assertRange(resolveActivityValueRange(progressive, 2), 2000, 15000, 'progressive tier 2');
assertRange(resolveActivityValueRange(progressive, 3), 3000, 25000, 'progressive tier 3');
assertRange(resolveActivityValueRange(progressive, 4), 4000, 30000, 'progressive tier 4');

// Missing exact tier 4 row → fall back to highest <= 4 (tier 3)
assertRange(
  resolveActivityValueRange(progressive.slice(0, 3), 4),
  3000,
  25000,
  'tier 4 falls back to tier 3 row'
);

const stepsActivity = {
  name: 'Steps',
  baseUnit: 'steps',
  values: stepsLegacy,
};

for (const tier of ACTIVITY_VALUE_TIERS) {
  const daily = getPlanTargetRange(stepsActivity, tier, 'daily');
  assertEqual(daily.minVal, 1000, `Steps daily min at tier ${tier}`);
  assertEqual(daily.maxVal, 30000, `Steps daily max at tier ${tier}`);

  const weekly = getPlanTargetRange(stepsActivity, tier, 'weekly');
  assertEqual(weekly.minVal, 1000, `Steps weekly min at tier ${tier}`);
  assertEqual(weekly.maxVal, 210000, `Steps weekly max at tier ${tier}`);
}

// Suggested 8000 must sit inside daily range for every unlock tier (Confirm enabled).
for (const tier of ACTIVITY_VALUE_TIERS) {
  const { minVal, maxVal } = getPlanTargetRange(stepsActivity, tier, 'daily');
  const suggested = 8000;
  if (suggested < minVal || suggested > maxVal) {
    throw new Error(`Suggested 8000 out of range at tier ${tier}: ${minVal}-${maxVal}`);
  }
}

assertEqual(resolveActivityValueRange([], 2), null, 'empty values → null');
assertEqual(resolveActivityValueRange(undefined, 3), null, 'undefined values → null');

console.log('activityInput tests passed (tiers 1–4)');
