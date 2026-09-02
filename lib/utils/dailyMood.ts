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

/** Five-face check-in shown on Happiness (maps onto stored mood values). */
export const DAYLIO_MOOD_OPTIONS = [
  { value: 'happy' as const, label: 'rad', face: 'rad' as const, color: '#C6D63C' },
  { value: 'good' as const, label: 'good', face: 'good' as const, color: '#6CBC5A' },
  { value: 'neutral' as const, label: 'meh', face: 'meh' as const, color: '#4DB6A8' },
  { value: 'sad' as const, label: 'bad', face: 'bad' as const, color: '#7E9AAB' },
  { value: 'stressed' as const, label: 'awful', face: 'awful' as const, color: '#6B5E56' },
] as const;

export type DaylioMoodFace = (typeof DAYLIO_MOOD_OPTIONS)[number]['face'];

export const MOOD_JOURNAL_EMOTIONS = [
  { id: 'happy', label: 'happy' },
  { id: 'excited', label: 'excited' },
  { id: 'grateful', label: 'grateful' },
  { id: 'relaxed', label: 'relaxed' },
  { id: 'content', label: 'content' },
  { id: 'tired', label: 'tired' },
  { id: 'unsure', label: 'unsure' },
  { id: 'bored', label: 'bored' },
  { id: 'anxious', label: 'anxious' },
  { id: 'angry', label: 'angry' },
  { id: 'stressed', label: 'stressed' },
  { id: 'sad', label: 'sad' },
  { id: 'desperate', label: 'desperate' },
] as const;

export type MoodJournalEmotionId = (typeof MOOD_JOURNAL_EMOTIONS)[number]['id'];

export interface DailyMoodMedia {
  url: string;
  mediaType?: string | null;
  durationMs?: number | null;
}

export interface DailyMoodView {
  mood: DailyMoodValue;
  label: string;
  emoji: string;
  expiresAt: string;
  updatedAt?: string | null;
  emotions?: string[];
  note?: string;
  photo?: DailyMoodMedia | null;
  voice?: DailyMoodMedia | null;
}

export function getMoodOption(value?: string | null) {
  if (!value) return null;
  return DAILY_MOOD_OPTIONS.find((option) => option.value === value) ?? null;
}

export function getDaylioMoodOption(value?: string | null) {
  if (!value) return null;
  const mapped = mapToDaylioMood(value);
  return DAYLIO_MOOD_OPTIONS.find((option) => option.value === mapped) ?? null;
}

/** Map any stored mood onto the five check-in faces. */
export function mapToDaylioMood(value?: string | null): DailyMoodValue | null {
  switch (value) {
    case 'happy':
    case 'excited':
    case 'energetic':
    case 'motivated':
      return 'happy';
    case 'good':
      return 'good';
    case 'neutral':
    case 'tired':
      return 'neutral';
    case 'sad':
      return 'sad';
    case 'angry':
    case 'stressed':
      return 'stressed';
    default:
      return null;
  }
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
