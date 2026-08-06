import type { WeeklyMood } from '@/lib/api/weeklyPlan';

export const MOOD_NUMERIC: Record<WeeklyMood, number> = {
  lovely: 5,
  good: 4,
  mixed: 3,
  tough: 2,
  exhausted: 1,
};

export const MOOD_LABELS: Record<number, string> = {
  5: 'Lovely',
  4: 'Good',
  3: 'Mixed',
  2: 'Tough',
  1: 'Exhausted',
};

export function moodToNumeric(mood?: WeeklyMood | null): number | null {
  if (!mood) return null;
  return MOOD_NUMERIC[mood] ?? null;
}

export function numericToMoodLabel(value: number): string {
  const rounded = Math.round(value);
  return MOOD_LABELS[rounded] ?? '';
}
