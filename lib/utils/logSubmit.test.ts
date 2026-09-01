/**
 * Run: npx --yes tsx lib/utils/logSubmit.test.ts
 */
import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import { collectUnusualValueWarnings } from './logSubmit';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const basePlan = {
  activities: [
    {
      activity: 'a1',
      cadence: 'weekly' as const,
      targetValue: 100,
      unit: 'mins',
      label: 'Weekly mins',
      TodayLogged: false,
    },
    {
      activity: 'a2',
      cadence: 'daily' as const,
      targetValue: 8000,
      dailyTarget: 8000,
      unit: 'steps',
      label: 'Daily steps',
      TodayLogged: false,
    },
  ],
} as WeeklyPlan;

const weeklyZero = collectUnusualValueWarnings(basePlan, { a1: 0 });
assert(weeklyZero.length === 0, 'weekly numeric 0 should not warn');

const weeklyLow = collectUnusualValueWarnings(basePlan, { a1: 5 });
assert(weeklyLow.length === 1, 'weekly numeric >0 and <10% should warn');

const dailyZero = collectUnusualValueWarnings(basePlan, { a2: 0 });
assert(dailyZero.length === 1, 'daily 0 should warn');

console.log('logSubmit unusual-value checks passed');
