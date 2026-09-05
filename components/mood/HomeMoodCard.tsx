'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dailyMoodAPI, dailyMoodQueryKeys } from '@/lib/api/dailyMood';
import { DailyMoodPickerSheet } from '@/components/mood/DailyMoodPickerSheet';
import { MoodIconBadge } from '@/components/mood/MoodIconBadge';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  getDaylioMoodOption,
  getMoodSpreadText,
  isDailyMoodActive,
  type DailyMoodView,
} from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';

interface HomeMoodCardProps {
  profileId?: string;
  suppressed?: boolean;
  className?: string;
}

function promptKey(profileId: string) {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `hf-mood-prompt:${profileId}:${day}`;
}

export function HomeMoodCard({
  profileId,
  suppressed = false,
  className,
}: HomeMoodCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const moodQuery = useQuery({
    queryKey: dailyMoodQueryKeys.mine(profileId),
    enabled: Boolean(profileId),
    queryFn: async () => {
      const res = await dailyMoodAPI.getMine();
      return res.data.data;
    },
    staleTime: 30_000,
  });

  const mood: DailyMoodView | null = isDailyMoodActive(moodQuery.data) ? moodQuery.data! : null;
  const daylio = getDaylioMoodOption(mood?.mood);
  const moodLabel = mood?.label || daylio?.label || mood?.mood || '';

  useEffect(() => {
    if (suppressed || !profileId || moodQuery.isLoading) return;
    if (mood) return;
    try {
      const key = promptKey(profileId);
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, '1');
      setPickerOpen(true);
    } catch {
      setPickerOpen(true);
    }
  }, [suppressed, profileId, mood, moodQuery.isLoading]);

  if (!profileId) return null;

  return (
    <>
      <div className={cn('space-y-2', className)}>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="home-mood flex w-full items-center gap-3 rounded-[1.5rem] border border-border bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/40"
        >
          {mood ? (
            <MoodIconBadge mood={mood.mood} emoji={mood.emoji} size="md" />
          ) : (
            <BrandLogo
              href=""
              size="md"
              className="pointer-events-none h-11 w-11 shrink-0 overflow-hidden rounded-full bg-secondary"
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-lg font-semibold leading-tight text-foreground">
              {mood ? getMoodSpreadText(mood.mood) : 'How are you ?'}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {mood
                ? mood.emotions?.length
                  ? `Feeling ${moodLabel} · ${
                      mood.emotions
                        .map((item) => (typeof item === 'string' ? item : item.name))
                        .filter(Boolean)
                        .slice(0, 3)
                        .join(', ')
                    }`
                  : `Feeling ${moodLabel}`
                : 'Tap to choose today’s mood'}
            </span>
          </span>
        </button>
      </div>

      <DailyMoodPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentMood={mood}
        profileId={profileId}
        onSaved={() => {
          void moodQuery.refetch();
        }}
      />
    </>
  );
}
