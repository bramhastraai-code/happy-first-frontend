export const DAILY_MOOD_OPTIONS = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'sad', label: 'Sad', emoji: '😔' },
  { value: 'angry', label: 'Angry', emoji: '😡' },
  { value: 'motivated', label: 'Motivated', emoji: '🔥' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'stressed', label: 'Stressed', emoji: '😫' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
] as const;

export type DailyMoodValue = (typeof DAILY_MOOD_OPTIONS)[number]['value'];

export interface DailyMoodView {
  mood: DailyMoodValue;
  label: string;
  emoji: string;
  expiresAt: string;
  updatedAt?: string | null;
}

export function getMoodOption(value?: string | null) {
  if (!value) return null;
  return DAILY_MOOD_OPTIONS.find((option) => option.value === value) ?? null;
}

export function formatDailyMoodInline(mood?: DailyMoodView | null) {
  if (!mood) return null;
  return `${mood.emoji} ${mood.label}`;
}

/** True when server says mood is still active. */
export function isDailyMoodActive(mood?: DailyMoodView | null, nowMs = Date.now()) {
  if (!mood?.expiresAt) return false;
  return new Date(mood.expiresAt).getTime() > nowMs;
}

export function moodExpiresInLabel(expiresAt: string, nowMs = Date.now()) {
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
