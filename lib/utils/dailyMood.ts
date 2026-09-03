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

export const MOOD_STICKER_COLORS = [
  '#C6D63C',
  '#6CBC5A',
  '#4DB6A8',
  '#5B9BD5',
  '#8B7EC8',
  '#E8A838',
  '#EA580C',
  '#EF4444',
  '#EC4899',
  '#F59E0B',
  '#7E9AAB',
  '#6B5E56',
] as const;

export interface MoodEmotionSticker {
  id: string;
  emoji: string;
  name: string;
  color: string;
  custom?: boolean;
}

export const MOOD_JOURNAL_EMOTIONS: MoodEmotionSticker[] = [
  { id: 'happy', emoji: '😊', name: 'happy', color: '#C6D63C' },
  { id: 'excited', emoji: '🤩', name: 'excited', color: '#E8A838' },
  { id: 'grateful', emoji: '🙏', name: 'grateful', color: '#6CBC5A' },
  { id: 'relaxed', emoji: '😌', name: 'relaxed', color: '#4DB6A8' },
  { id: 'content', emoji: '🥰', name: 'content', color: '#EA580C' },
  { id: 'tired', emoji: '😴', name: 'tired', color: '#7E9AAB' },
  { id: 'unsure', emoji: '🤔', name: 'unsure', color: '#8B7EC8' },
  { id: 'bored', emoji: '😑', name: 'bored', color: '#9CA3AF' },
  { id: 'anxious', emoji: '😰', name: 'anxious', color: '#F59E0B' },
  { id: 'angry', emoji: '😡', name: 'angry', color: '#EF4444' },
  { id: 'stressed', emoji: '😫', name: 'stressed', color: '#6B5E56' },
  { id: 'sad', emoji: '😔', name: 'sad', color: '#64748B' },
  { id: 'desperate', emoji: '🆘', name: 'desperate', color: '#B91C1C' },
];

export type MoodJournalEmotionId = (typeof MOOD_JOURNAL_EMOTIONS)[number]['id'];

export function moodStickerStorageKey(profileId?: string | null) {
  return `hf-mood-stickers:${profileId || 'me'}`;
}

export function hydrateMoodStickers(raw?: unknown): MoodEmotionSticker[] {
  if (!Array.isArray(raw)) return [];
  const out: MoodEmotionSticker[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string') {
      const preset = MOOD_JOURNAL_EMOTIONS.find((row) => row.id === item);
      if (!preset || seen.has(preset.id)) continue;
      out.push(preset);
      seen.add(preset.id);
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<MoodEmotionSticker>;
    const emoji = String(row.emoji || '').trim().slice(0, 16) || '🙂';
    const name = String(row.name || '').trim().slice(0, 40) || 'custom';
    const color = String(row.color || '').trim() || '#EA580C';
    const id = String(row.id || '').trim() || `custom-${out.length}`;
    if (seen.has(id)) continue;
    const preset = MOOD_JOURNAL_EMOTIONS.find((p) => p.id === id);
    out.push({
      id,
      emoji,
      name,
      color,
      custom: Boolean(row.custom) || !preset,
    });
    seen.add(id);
  }
  return out;
}

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
  emotions?: MoodEmotionSticker[] | string[];
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
