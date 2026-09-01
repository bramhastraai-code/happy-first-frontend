export const DAILY_MOOD_OPTIONS = [
  { value: 'lovely', label: 'Lovely', emoji: '🌟' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'mixed', label: 'Mixed', emoji: '😐' },
  { value: 'tough', label: 'Tough', emoji: '😓' },
  { value: 'exhausted', label: 'Exhausted', emoji: '😴' },
] as const;

export type DailyMoodValue = (typeof DAILY_MOOD_OPTIONS)[number]['value'];
