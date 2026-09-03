import api from './axios';
import type { DailyMoodValue, DailyMoodView, MoodEmotionSticker } from '@/lib/utils/dailyMood';

type Envelope<T> = { data: T; message?: string; success?: boolean };

export type DailyMoodSaveInput = {
  mood: DailyMoodValue;
  emotions?: MoodEmotionSticker[] | string[];
};

export const dailyMoodAPI = {
  getMine: () =>
    api.get<Envelope<DailyMoodView | null>>('/dailyMood'),

  set: (mood: DailyMoodValue) =>
    api.put<Envelope<DailyMoodView>>('/dailyMood', { mood }),

  saveJournal: (input: DailyMoodSaveInput) => {
    const form = new FormData();
    form.append('mood', input.mood);
    form.append('emotions', JSON.stringify(input.emotions || []));
    return api.put<Envelope<DailyMoodView>>('/dailyMood', form);
  },

  remove: () =>
    api.delete<Envelope<{ removed: boolean }>>('/dailyMood'),
};

/** Query keys shared across profile, feed, and picker. */
export const dailyMoodQueryKeys = {
  mine: (profileId?: string) => ['dailyMood', profileId ?? 'me'] as const,
};

/** Invalidate mood-dependent caches after save/remove/follow change. */
export function dailyMoodInvalidationKeys(profileId?: string) {
  return [
    dailyMoodQueryKeys.mine(profileId),
    ['publicProfile'],
    ['profilePosts'],
    ['feed'],
    ['feedExplore'],
  ] as const;
}
