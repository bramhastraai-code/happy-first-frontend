import api from './axios';
import type { DailyMoodValue, DailyMoodView } from '@/lib/utils/dailyMood';

type Envelope<T> = { data: T; message?: string; success?: boolean };

export type DailyMoodSaveInput = {
  mood: DailyMoodValue;
  emotions?: string[];
  note?: string;
  photo?: Blob | File | null;
  photoName?: string;
  voice?: Blob | File | null;
  voiceName?: string;
  voiceDurationMs?: number | null;
  clearPhoto?: boolean;
  clearVoice?: boolean;
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
    form.append('note', input.note || '');
    if (input.clearPhoto) form.append('clearPhoto', 'true');
    if (input.clearVoice) form.append('clearVoice', 'true');
    if (input.voiceDurationMs) {
      form.append('voiceDurationMs', String(Math.round(input.voiceDurationMs)));
    }
    if (input.photo) {
      form.append('photo', input.photo, input.photoName || 'mood.jpg');
    }
    if (input.voice) {
      form.append('voice', input.voice, input.voiceName || 'mood-voice.webm');
    }
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
