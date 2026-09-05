import api from './axios';
import type { DailyMoodMedia, DailyMoodView } from '@/lib/utils/dailyMood';

type Envelope<T> = { data: T; message?: string; success?: boolean };

export type MoodCatalogItem = {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
};

export type MoodHistoryDay = {
  date: string;
  emoji: string;
  label: string;
  hasPhoto: boolean;
  count: number;
};

export type MoodHistoryEntry = {
  id: string;
  mood: string;
  label: string;
  emoji: string;
  note: string;
  photo?: DailyMoodMedia | null;
  setAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
};

export type MoodHistoryData = {
  month: number;
  year: number;
  timezone: string;
  days: MoodHistoryDay[];
  entries: MoodHistoryEntry[];
};

export type DailyMoodSaveInput = {
  mood: string;
  label?: string;
  emoji?: string;
  note?: string;
  photoFile?: File | null;
  clearPhoto?: boolean;
  emotions?: Array<{ id: string; emoji: string; name: string; color: string }> | string[];
};

export const dailyMoodAPI = {
  getMine: () => api.get<Envelope<DailyMoodView | null>>('/dailyMood'),

  set: (mood: string) => api.put<Envelope<DailyMoodView>>('/dailyMood', { mood }),

  save: (input: DailyMoodSaveInput) => {
    const form = new FormData();
    form.append('mood', input.mood);
    if (input.label) form.append('label', input.label);
    if (input.emoji) form.append('emoji', input.emoji);
    if (input.note !== undefined) form.append('note', input.note);
    if (input.emotions) form.append('emotions', JSON.stringify(input.emotions));
    if (input.clearPhoto) form.append('clearPhoto', 'true');
    if (input.photoFile) form.append('photo', input.photoFile);
    return api.put<Envelope<DailyMoodView>>('/dailyMood', form);
  },

  /** @deprecated Prefer save() — kept for older picker callers. */
  saveJournal: (input: { mood: string; emotions?: DailyMoodSaveInput['emotions'] }) => {
    const form = new FormData();
    form.append('mood', input.mood);
    form.append('emotions', JSON.stringify(input.emotions || []));
    return api.put<Envelope<DailyMoodView>>('/dailyMood', form);
  },

  remove: () => api.delete<Envelope<{ removed: boolean }>>('/dailyMood'),

  getSettings: () =>
    api.get<Envelope<{ moods: MoodCatalogItem[] }>>('/dailyMood/settings'),

  updateSettings: (moods: Array<{ id?: string; name: string; emoji: string }>) =>
    api.put<Envelope<{ moods: MoodCatalogItem[] }>>('/dailyMood/settings', { moods }),

  getHistory: (params?: { month?: number; year?: number }) =>
    api.get<Envelope<MoodHistoryData>>('/dailyMood/history', { params }),
};

export const dailyMoodQueryKeys = {
  mine: (profileId?: string) => ['dailyMood', profileId ?? 'me'] as const,
  settings: (profileId?: string) => ['dailyMood', 'settings', profileId ?? 'me'] as const,
  history: (profileId: string | undefined, month: number, year: number) =>
    ['dailyMood', 'history', profileId ?? 'me', year, month] as const,
};

export function dailyMoodInvalidationKeys(profileId?: string) {
  return [
    dailyMoodQueryKeys.mine(profileId),
    dailyMoodQueryKeys.settings(profileId),
    ['dailyMood', 'history', profileId ?? 'me'],
    ['publicProfile'],
    ['profilePosts'],
    ['feed'],
    ['feedExplore'],
  ] as const;
}
